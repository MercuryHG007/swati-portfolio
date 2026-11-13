import { AnalyticsHeader, AnalyticsUnavailable } from "@/components/admin/analytics/analytics-header";
import { BreakdownCard, Group } from "@/components/admin/analytics/analytics-ui";
import { parseRangeDays } from "@/lib/analytics-dashboard";
import { loadAnalyticsPage } from "@/lib/analytics-page-data";

export default async function AnalyticsPagesPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const days = parseRangeDays((await searchParams).range);
  const data = await loadAnalyticsPage(days, false);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-16">
      <AnalyticsHeader section="pages" days={days} />
      {data.status === "ready" ? (
        <Group title="Site sections">
          <BreakdownCard title="Pages by type" labelHeader="Type" rows={data.dashboard.pageTypes} empty="No page views yet." />
          <BreakdownCard title="Top pages" labelHeader="Page" rows={data.dashboard.topPages} empty="No page views yet." />
        </Group>
      ) : (
        <AnalyticsUnavailable status={data.status} />
      )}
    </main>
  );
}
