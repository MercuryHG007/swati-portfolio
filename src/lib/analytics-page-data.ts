import { after } from "next/server";
import { type AnalyticsDashboard, type RangeDays } from "@/lib/analytics-dashboard";
import { getCachedDashboard, warmDashboards } from "@/lib/analytics-cache";
import { getGa4Config, getRealtimeSnapshot, type RealtimeSnapshot } from "@/lib/ga4";

export type AnalyticsPageData =
  | { status: "not-connected" | "error" }
  | { status: "ready"; dashboard: AnalyticsDashboard; realtime: RealtimeSnapshot | null };

// Every analytics page loads the same dashboard data; only the overview also asks for live visitors.
// After the response is sent, the other periods are loaded too, so switching tabs does not wait on GA4.
export async function loadAnalyticsPage(days: RangeDays, includeRealtime: boolean): Promise<AnalyticsPageData> {
  const config = getGa4Config();
  if (!config) return { status: "not-connected" };

  after(() => warmDashboards(config));

  try {
    const [dashboard, realtime] = await Promise.all([
      getCachedDashboard(config, days),
      includeRealtime ? getRealtimeSnapshot(config).catch(() => null) : Promise.resolve(null),
    ]);
    return { status: "ready", dashboard, realtime };
  } catch (caught) {
    console.error("GA4 dashboard failed:", caught instanceof Error ? caught.message : caught);
    return { status: "error" };
  }
}
