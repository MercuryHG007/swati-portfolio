import { createSign } from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DATA_API_URL = "https://analyticsdata.googleapis.com/v1beta";
const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

// Only our own events; GA4's automatic events would crowd out what we track.
const TRACKED_EVENTS = ["view_item", "generate_lead"];
const DATE_RANGES = [{ startDate: "28daysAgo", endDate: "today" }];

export interface Ga4Config {
  propertyId: string;
  clientEmail: string;
  privateKey: string;
}

export interface AnalyticsOverview {
  totals: { activeUsers: number; sessions: number; pageViews: number };
  topPages: { path: string; views: number }[];
  topEvents: { name: string; count: number }[];
}

interface ReportRow {
  dimensions: string[];
  metrics: number[];
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

async function runReport(config: Ga4Config, body: Record<string, unknown>): Promise<ReportRow[]> {
  const token = await getAccessToken(config);
  const response = await fetch(`${DATA_API_URL}/properties/${encodeURIComponent(config.propertyId)}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ dateRanges: DATE_RANGES, ...body }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Google Analytics report failed (HTTP ${response.status}).`);
  }

  const rows: unknown[] = Array.isArray(payload?.rows) ? payload.rows : [];
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

export async function getAnalyticsOverview(config: Ga4Config): Promise<AnalyticsOverview> {
  const [totalRows, pageRows, eventRows] = await Promise.all([
    runReport(config, {
      metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }],
    }),
    runReport(config, {
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 10,
    }),
    runReport(config, {
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        filter: { fieldName: "eventName", inListFilter: { values: TRACKED_EVENTS } },
      },
      orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
      limit: 10,
    }),
  ]);

  const [activeUsers = 0, sessions = 0, pageViews = 0] = totalRows[0]?.metrics ?? [];
  return {
    totals: { activeUsers, sessions, pageViews },
    topPages: pageRows.map((row) => ({ path: row.dimensions[0] ?? "", views: row.metrics[0] ?? 0 })),
    topEvents: eventRows.map((row) => ({ name: row.dimensions[0] ?? "", count: row.metrics[0] ?? 0 })),
  };
}
