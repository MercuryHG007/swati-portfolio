import { cardClass } from "@/components/admin/ui";
import {
  AnalyticsHeader,
  AnalyticsUnavailable,
} from "@/components/admin/analytics/analytics-header";
import {
  BreakdownCard,
  formatCount,
  Group,
  HighlightCard,
  StatCard,
  TrendChart,
} from "@/components/admin/analytics/analytics-ui";
import { AnalyticsSummary } from "@/components/admin/analytics/analytics-summary";
import { getCachedSummary, type CachedSummary } from "@/lib/analytics-cache";
import {
  parseRangeDays,
  type AnalyticsDashboard,
  type Count,
  type RangeDays,
} from "@/lib/analytics-dashboard";
import { loadAnalyticsPage } from "@/lib/analytics-page-data";
import type { RealtimeSnapshot } from "@/lib/ga4";

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const days = parseRangeDays((await searchParams).range);
  const data = await loadAnalyticsPage(days, true);
  const summary = data.status === "ready" ? await getCachedSummary(days) : null;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-16">
      <AnalyticsHeader section="overview" days={days} />
      {data.status === "ready" ? (
        <Overview days={days} dashboard={data.dashboard} realtime={data.realtime} summary={summary} />
      ) : (
        <AnalyticsUnavailable status={data.status} />
      )}
    </main>
  );
}

function Overview({
  days,
  dashboard,
  realtime,
  summary,
}: {
  days: RangeDays;
  dashboard: AnalyticsDashboard;
  realtime: RealtimeSnapshot | null;
  summary: CachedSummary | null;
}) {
  return (
    <>
      <AnalyticsSummary key={days} days={days} initial={summary} />

      {realtime ? (
        <section className={`${cardClass} grid gap-4 md:grid-cols-[auto_1fr] md:items-start`}>
          <div className="flex flex-col">
            <p className="text-3xl font-semibold tabular-nums text-foreground">{formatCount(realtime.activeUsers)}</p>
            <p className="text-sm text-muted">Visitors on the site right now (last 30 minutes)</p>
          </div>
          <BreakdownCard
            title="Live pages"
            labelHeader="Page"
            rows={realtime.screens.map((screen) => ({ label: screen.label || "Not set", value: screen.value }))}
            empty="No one is on the site right now."
          />
        </section>
      ) : null}

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {dashboard.kpis.map((kpi) => (
              <StatCard key={kpi.label} kpi={kpi} />
            ))}
          </div>

          <section className={`${cardClass} flex flex-col gap-4`}>
            <h2 className="text-sm font-medium text-foreground">Daily trend</h2>
            <TrendChart points={dashboard.trend} />
          </section>

          <Group title="Key highlights" columns="md:grid-cols-3">
            {buildHighlights(dashboard, days).map((highlight) => (
              <HighlightCard key={highlight.label} {...highlight} />
            ))}
          </Group>
    </>
  );
}

function shareOf(rows: Count[], row: Count): number {
  const total = rows.reduce((sum, item) => sum + item.value, 0);
  return total > 0 ? Math.round((row.value / total) * 100) : 0;
}

function buildHighlights(dashboard: AnalyticsDashboard, days: RangeDays) {
  const channel = dashboard.channels[0];
  const landingPage = dashboard.landingPages[0];
  const artwork = dashboard.topArtworks[0];
  const enquirySource = dashboard.enquiries.bySource[0];
  const device = dashboard.devices[0];
  const base = `/admin/analytics`;

  return [
    {
      label: "Top channel",
      value: channel?.label ?? "No traffic yet",
      detail: channel
        ? `${formatCount(channel.value)} sessions · ${shareOf(dashboard.channels, channel)}% of traffic`
        : "Appears once visitors arrive",
      href: `${base}/traffic?range=${days}`,
    },
    {
      label: "Top landing page",
      value: landingPage?.label ?? "No landing pages yet",
      detail: landingPage ? `${formatCount(landingPage.value)} sessions started here` : "Appears once visitors arrive",
      href: `${base}/traffic?range=${days}`,
    },
    {
      label: "Most viewed artwork",
      value: artwork?.title ?? "No artwork views yet",
      detail: artwork ? `${formatCount(artwork.views)} views · ${artwork.enquiries} enquiries` : "Appears once artworks are viewed",
      href: `${base}/artworks?range=${days}`,
    },
    {
      label: "Top enquiry source",
      value: enquirySource?.label ?? "No enquiries yet",
      detail: enquirySource ? `${formatCount(enquirySource.value)} enquiries in this period` : "Appears once someone enquires",
      href: `${base}/enquiries?range=${days}`,
    },
    {
      label: "Top device",
      value: device?.label ?? "No data yet",
      detail: device ? `${shareOf(dashboard.devices, device)}% of visitors` : "Appears once visitors arrive",
      href: `${base}/audience?range=${days}`,
    },
    {
      label: "Viewed, no enquiry",
      value: `${formatCount(dashboard.viewedNotEnquired.length)} artworks`,
      detail: "Published, not sold, and viewed with no enquiry yet",
      href: `${base}/artworks?range=${days}`,
    },
  ];
}
