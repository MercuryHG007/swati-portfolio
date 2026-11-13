import { AnalyticsHeader, AnalyticsUnavailable } from "@/components/admin/analytics/analytics-header";
import { BreakdownCard, Funnel, Group } from "@/components/admin/analytics/analytics-ui";
import { parseRangeDays } from "@/lib/analytics-dashboard";
import { loadAnalyticsPage } from "@/lib/analytics-page-data";
import { cardClass } from "@/components/admin/ui";

export default async function AnalyticsEnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const days = parseRangeDays((await searchParams).range);
  const data = await loadAnalyticsPage(days, false);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-16">
      <AnalyticsHeader section="enquiries" days={days} />
      {data.status === "ready" ? (
        <>
          <Group title="From visit to enquiry">
            <section className={`${cardClass} flex flex-col gap-4`}>
              <h3 className="text-sm font-medium text-foreground">Visitor journey</h3>
              <Funnel steps={data.dashboard.funnel} />
              <p className="text-xs text-muted">
                Enquiries come from the database and are exact. GA4 recorded {data.dashboard.enquiries.ga4FormSends}{" "}
                form sends in this period. Visitors who declined analytics cookies are not counted.
              </p>
            </section>
            <BreakdownCard
              title="Enquiries by source"
              labelHeader="Source"
              rows={data.dashboard.enquiries.bySource}
              empty="No enquiries in this period."
            />
          </Group>
          <Group title="Enquiries by artwork" columns="md:grid-cols-1">
            <BreakdownCard
              title="Artworks that led to an enquiry"
              labelHeader="Artwork"
              rows={data.dashboard.enquiries.byArtwork}
              empty="No enquiries linked to an artwork in this period."
            />
          </Group>
        </>
      ) : (
        <AnalyticsUnavailable status={data.status} />
      )}
    </main>
  );
}
