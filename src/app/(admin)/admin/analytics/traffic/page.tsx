import { AnalyticsHeader, AnalyticsUnavailable } from "@/components/admin/analytics/analytics-header";
import { BreakdownCard, Group } from "@/components/admin/analytics/analytics-ui";
import { parseRangeDays } from "@/lib/analytics-dashboard";
import { loadAnalyticsPage } from "@/lib/analytics-page-data";

export default async function AnalyticsTrafficPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const days = parseRangeDays((await searchParams).range);
  const data = await loadAnalyticsPage(days, false);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-16">
      <AnalyticsHeader section="traffic" days={days} />
      {data.status === "ready" ? (
        <Group title="Where visitors come from">
          <BreakdownCard title="Channels" labelHeader="Channel" rows={data.dashboard.channels} empty="No traffic yet." />
          <BreakdownCard
            title="Source / medium"
            labelHeader="Source / medium"
            rows={data.dashboard.sourceMedium}
            empty="No traffic yet."
          />
          <BreakdownCard
            title="Campaigns"
            labelHeader="Campaign"
            rows={data.dashboard.campaigns}
            empty="No campaign traffic yet."
          />
          <BreakdownCard
            title="Landing pages"
            labelHeader="Page"
            rows={data.dashboard.landingPages}
            empty="No traffic yet."
          />
        </Group>
      ) : (
        <AnalyticsUnavailable status={data.status} />
      )}
    </main>
  );
}
