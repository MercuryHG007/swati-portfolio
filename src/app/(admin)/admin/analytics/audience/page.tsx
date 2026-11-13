import { AnalyticsHeader, AnalyticsUnavailable } from "@/components/admin/analytics/analytics-header";
import { BreakdownCard, Group } from "@/components/admin/analytics/analytics-ui";
import { parseRangeDays } from "@/lib/analytics-dashboard";
import { loadAnalyticsPage } from "@/lib/analytics-page-data";

export default async function AnalyticsAudiencePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const days = parseRangeDays((await searchParams).range);
  const data = await loadAnalyticsPage(days, false);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-16">
      <AnalyticsHeader section="audience" days={days} />
      {data.status === "ready" ? (
        <Group title="Who is visiting" columns="md:grid-cols-3">
          <BreakdownCard title="Devices" labelHeader="Device" rows={data.dashboard.devices} empty="No data yet." />
          <BreakdownCard title="Countries" labelHeader="Country" rows={data.dashboard.countries} empty="No data yet." />
          <BreakdownCard
            title="New vs returning"
            labelHeader="Visitor"
            rows={data.dashboard.newVsReturning}
            empty="No data yet."
          />
        </Group>
      ) : (
        <AnalyticsUnavailable status={data.status} />
      )}
    </main>
  );
}
