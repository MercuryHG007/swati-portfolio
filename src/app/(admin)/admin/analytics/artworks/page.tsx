import { AnalyticsHeader, AnalyticsUnavailable } from "@/components/admin/analytics/analytics-header";
import { ArtworkTable, BreakdownCard, Group } from "@/components/admin/analytics/analytics-ui";
import { cardClass } from "@/components/admin/ui";
import { parseRangeDays } from "@/lib/analytics-dashboard";
import { loadAnalyticsPage } from "@/lib/analytics-page-data";

export default async function AnalyticsArtworksPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const days = parseRangeDays((await searchParams).range);
  const data = await loadAnalyticsPage(days, false);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-16">
      <AnalyticsHeader section="artworks" days={days} />
      {data.status === "ready" ? (
        <>
          <section className={`${cardClass} flex flex-col gap-3`}>
            <h2 className="text-sm font-medium text-foreground">Most viewed</h2>
            <ArtworkTable rows={data.dashboard.topArtworks} empty="No artwork views in this period." />
          </section>
          <Group title="Views by category" columns="md:grid-cols-3">
            <BreakdownCard title="By medium" labelHeader="Medium" valueHeader="Views" rows={data.dashboard.byMedium} empty="No artwork views yet." />
            <BreakdownCard title="By series" labelHeader="Series" valueHeader="Views" rows={data.dashboard.bySeries} empty="No artwork views yet." />
            <BreakdownCard title="By subject" labelHeader="Subject" valueHeader="Views" rows={data.dashboard.bySubject} empty="No artwork views yet." />
          </Group>
          <Group title="Availability and interest">
            <section className={`${cardClass} flex flex-col gap-3`}>
              <h3 className="text-sm font-medium text-foreground">Sold vs available</h3>
              <table className="w-full text-sm">
                <thead className="text-left text-muted">
                  <tr>
                    <th className="py-1 font-normal">Availability</th>
                    <th className="py-1 text-right font-normal">Artworks</th>
                    <th className="py-1 text-right font-normal">Views</th>
                  </tr>
                </thead>
                <tbody className="text-foreground">
                  {data.dashboard.availability.map((row) => (
                    <tr key={row.label} className="border-t border-border">
                      <td className="py-2">{row.label}</td>
                      <td className="py-2 text-right tabular-nums">{row.artworks}</td>
                      <td className="py-2 text-right tabular-nums">{row.views}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            <section className={`${cardClass} flex flex-col gap-3`}>
              <h3 className="text-sm font-medium text-foreground">Viewed, but no enquiry yet</h3>
              <p className="text-xs text-muted">Published, not sold, and viewed in this period.</p>
              <ArtworkTable rows={data.dashboard.viewedNotEnquired} empty="Every viewed artwork has an enquiry." />
            </section>
          </Group>
        </>
      ) : (
        <AnalyticsUnavailable status={data.status} />
      )}
    </main>
  );
}
