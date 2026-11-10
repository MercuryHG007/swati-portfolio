import { cardClass } from "@/components/admin/ui";
import { getAnalyticsOverview, getGa4Config } from "@/lib/ga4";

const numberFormatter = new Intl.NumberFormat("en-IN");

export default async function AdminAnalyticsPage() {
  const config = getGa4Config();
  let overview: Awaited<ReturnType<typeof getAnalyticsOverview>> | null = null;
  let error = "";

  if (config) {
    try {
      overview = await getAnalyticsOverview(config);
    } catch (caught) {
      console.error("GA4 overview failed:", caught instanceof Error ? caught.message : caught);
      error = "Analytics could not be loaded from Google Analytics. Check the GA4 settings and try again.";
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
        <p className="text-sm text-muted">Last 28 days, from Google Analytics.</p>
      </div>

      {!config ? (
        <p className={`${cardClass} text-sm text-muted`}>
          Google Analytics is not connected. Set GA4_PROPERTY_ID, GA4_CLIENT_EMAIL and GA4_PRIVATE_KEY to see reports here.
        </p>
      ) : null}

      {error ? <p className={`${cardClass} text-sm text-red-600`}>{error}</p> : null}

      {overview ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label="Active users" value={overview.totals.activeUsers} />
            <Stat label="Sessions" value={overview.totals.sessions} />
            <Stat label="Page views" value={overview.totals.pageViews} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Table
              title="Top pages"
              empty="No page views yet."
              header="Page"
              rows={overview.topPages.map((page) => ({ label: page.path, value: page.views }))}
            />
            <Table
              title="Enquiry and artwork events"
              empty="No events yet."
              header="Event"
              rows={overview.topEvents.map((event) => ({ label: event.name, value: event.count }))}
            />
          </div>
        </>
      ) : null}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className={cardClass}>
      <p className="text-2xl font-semibold text-foreground">{numberFormatter.format(value)}</p>
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}

function Table({
  title,
  header,
  empty,
  rows,
}: {
  title: string;
  header: string;
  empty: string;
  rows: { label: string; value: number }[];
}) {
  return (
    <section className={`${cardClass} flex flex-col gap-3`}>
      <h2 className="text-sm font-medium text-foreground">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-1 font-normal">{header}</th>
              <th className="py-1 text-right font-normal">Count</th>
            </tr>
          </thead>
          <tbody className="text-foreground">
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-border">
                <td className="max-w-0 truncate py-2 pr-3">{row.label}</td>
                <td className="py-2 text-right tabular-nums">{numberFormatter.format(row.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
