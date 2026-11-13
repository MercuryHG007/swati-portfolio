import { createSign } from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DATA_API_URL = "https://analyticsdata.googleapis.com/v1beta";
const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

// The Data API accepts up to 5 reports per batch call.
const MAX_BATCH_SIZE = 5;

// Only our own events; GA4's automatic events would crowd out what we track.
export const TRACKED_EVENTS = ["view_item", "contact_click", "generate_lead"];

export interface DateRange {
  name: string;
  startDate: string;
  endDate: string;
}

export type ReportBody = Record<string, unknown>;

export interface Ga4Config {
  propertyId: string;
  clientEmail: string;
  privateKey: string;
}

export interface ReportRow {
  dimensions: string[];
  metrics: number[];
}

export interface RealtimeSnapshot {
  activeUsers: number;
  screens: { label: string; value: number }[];
}

// The current period and the period of equal length before it, for "vs previous" comparisons.
export function reportRanges(days: number): { current: DateRange; previous: DateRange } {
  return {
    current: { name: "current", startDate: `${days - 1}daysAgo`, endDate: "today" },
    previous: { name: "previous", startDate: `${days * 2 - 1}daysAgo`, endDate: `${days}daysAgo` },
  };
}

export function named(...names: string[]): { name: string }[] {
  return names.map((name) => ({ name }));
}

export function getGa4Config(): Ga4Config | null {
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();
  const clientEmail = process.env.GA4_CLIENT_EMAIL?.trim();
  const privateKey = process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!propertyId || !clientEmail || !privateKey) return null;
  return { propertyId, clientEmail, privateKey };
}

const cachedTokens = new Map<string, { value: string; expiresAt: number }>();

async function getAccessToken(config: Ga4Config): Promise<string> {
  const cached = cachedTokens.get(config.clientEmail);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.value;

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const claims = Buffer.from(JSON.stringify({
    iss: config.clientEmail,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  })).toString("base64url");
  const unsigned = `${header}.${claims}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(config.privateKey, "base64url");

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || typeof payload?.access_token !== "string") {
    throw new Error(`Google sign-in failed (HTTP ${response.status}). Check the GA4 service account.`);
  }

  cachedTokens.set(config.clientEmail, {
    value: payload.access_token,
    expiresAt: Date.now() + Number(payload.expires_in ?? 3600) * 1000,
  });
  return payload.access_token;
}

async function postDataApi(config: Ga4Config, action: string, body: unknown): Promise<unknown> {
  const token = await getAccessToken(config);
  const response = await fetch(`${DATA_API_URL}/properties/${encodeURIComponent(config.propertyId)}:${action}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = (payload as { error?: { message?: unknown } } | null)?.error?.message;
    throw new Error(
      `Google Analytics report failed (HTTP ${response.status})${typeof detail === "string" ? `: ${detail}` : "."}`,
    );
  }
  return payload;
}

function toRows(payload: unknown): ReportRow[] {
  const rows = (payload as { rows?: unknown } | null)?.rows;
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    const record = row as {
      dimensionValues?: { value?: string }[];
      metricValues?: { value?: string }[];
    };
    return {
      dimensions: (record.dimensionValues ?? []).map((value) => value.value ?? ""),
      metrics: (record.metricValues ?? []).map((value) => Number(value.value ?? 0)),
    };
  });
}

// Runs reports in batches of up to MAX_BATCH_SIZE, so the batches stay within GA4's concurrency limit.
export async function runReports(config: Ga4Config, bodies: ReportBody[]): Promise<ReportRow[][]> {
  const batches: ReportBody[][] = [];
  for (let index = 0; index < bodies.length; index += MAX_BATCH_SIZE) {
    batches.push(bodies.slice(index, index + MAX_BATCH_SIZE));
  }
  const results = await Promise.all(
    batches.map(async (requests) => {
      const payload = await postDataApi(config, "batchRunReports", { requests });
      const reports = (payload as { reports?: unknown } | null)?.reports;
      return Array.isArray(reports) ? reports.map(toRows) : [];
    }),
  );
  return results.flat();
}

export async function getRealtimeSnapshot(config: Ga4Config): Promise<RealtimeSnapshot> {
  const [totalRows, screenRows] = await Promise.all([
    postDataApi(config, "runRealtimeReport", { metrics: named("activeUsers") }).then(toRows),
    postDataApi(config, "runRealtimeReport", {
      dimensions: named("unifiedScreenName"),
      metrics: named("activeUsers"),
      limit: 5,
    }).then(toRows),
  ]);
  return {
    activeUsers: totalRows[0]?.metrics[0] ?? 0,
    screens: screenRows
      .map((row) => ({ label: row.dimensions[0] ?? "", value: row.metrics[0] ?? 0 }))
      .sort((a, b) => b.value - a.value),
  };
}

