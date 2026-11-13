import {
  getAnalyticsDashboard,
  RANGE_DAYS,
  type AnalyticsDashboard,
  type RangeDays,
} from "@/lib/analytics-dashboard";
import type { Ga4Config } from "@/lib/ga4";
import { connectToDatabase } from "@/lib/mongodb";
import { AnalyticsSummary } from "@/models";

// Dashboard data is kept in server memory, one entry per period. Each server instance keeps its own copy.
const DASHBOARD_TTL_MS = 10 * 60 * 1000;

export interface CachedSummary {
  summary: string;
  generatedAt: string;
}

const dashboards = new Map<RangeDays, { value: AnalyticsDashboard; loadedAt: number }>();
const loading = new Map<RangeDays, Promise<AnalyticsDashboard>>();

function isFresh(loadedAt: number, ttlMs: number): boolean {
  return Date.now() - loadedAt < ttlMs;
}

function hasFreshDashboard(days: RangeDays): boolean {
  const entry = dashboards.get(days);
  return Boolean(entry && isFresh(entry.loadedAt, DASHBOARD_TTL_MS));
}

function refreshDashboard(config: Ga4Config, days: RangeDays): Promise<AnalyticsDashboard> {
  const pending = loading.get(days);
  if (pending) return pending;

  const request = getAnalyticsDashboard(config, days)
    .then((value) => {
      dashboards.set(days, { value, loadedAt: Date.now() });
      return value;
    })
    .finally(() => {
      loading.delete(days);
    });
  loading.set(days, request);
  return request;
}

export function getCachedDashboard(config: Ga4Config, days: RangeDays): Promise<AnalyticsDashboard> {
  const entry = dashboards.get(days);
  if (entry && isFresh(entry.loadedAt, DASHBOARD_TTL_MS)) return Promise.resolve(entry.value);
  return refreshDashboard(config, days);
}

// Loads every period that is missing or stale. Called after a page has responded, so the other tabs are ready when clicked.
export async function warmDashboards(config: Ga4Config): Promise<void> {
  await Promise.all(
    RANGE_DAYS.filter((days) => !hasFreshDashboard(days)).map((days) =>
      refreshDashboard(config, days).catch((caught: unknown) => {
        console.error(
          `GA4 warm-up for ${days} days failed:`,
          caught instanceof Error ? caught.message : caught,
        );
      }),
    ),
  );
}

export async function getCachedSummary(days: RangeDays): Promise<CachedSummary | null> {
  await connectToDatabase();
  const doc = await AnalyticsSummary.findOne({ days }).lean();
  if (!doc) return null;
  return { summary: doc.summary, generatedAt: new Date(doc.generatedAt).toISOString() };
}

// Replaces the period's summary. It stays until the next one is written.
export async function setCachedSummary(days: RangeDays, summary: string): Promise<CachedSummary> {
  await connectToDatabase();
  const generatedAt = new Date();
  await AnalyticsSummary.updateOne({ days }, { days, summary, generatedAt }, { upsert: true });
  return { summary, generatedAt: generatedAt.toISOString() };
}
