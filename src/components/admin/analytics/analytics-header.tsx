import { cardClass } from "@/components/admin/ui";
import { AnalyticsTabs, RangeSelector } from "@/components/admin/analytics/analytics-nav";
import { RANGE_DAYS, type RangeDays } from "@/lib/analytics-dashboard";

export const ANALYTICS_SECTIONS = [
  { key: "overview", label: "Overview", href: "/admin/analytics" },
  { key: "traffic", label: "Traffic", href: "/admin/analytics/traffic" },
  { key: "audience", label: "Audience", href: "/admin/analytics/audience" },
  { key: "enquiries", label: "Enquiries", href: "/admin/analytics/enquiries" },
  { key: "pages", label: "Pages", href: "/admin/analytics/pages" },
  { key: "artworks", label: "Artworks", href: "/admin/analytics/artworks" },
] as const;

export type AnalyticsSection = (typeof ANALYTICS_SECTIONS)[number]["key"];

export function AnalyticsHeader({ section, days }: { section: AnalyticsSection; days: RangeDays }) {
  const active = ANALYTICS_SECTIONS.find((item) => item.key === section) ?? ANALYTICS_SECTIONS[0];
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
          <p className="text-sm text-muted">
            Last {days} days, compared with the {days} days before. Times in India.
          </p>
        </div>
        <RangeSelector current={days} basePath={active.href} ranges={RANGE_DAYS} />
      </div>
      <AnalyticsTabs tabs={ANALYTICS_SECTIONS} activeKey={active.key} days={days} />
    </div>
  );
}

export function AnalyticsUnavailable({ status }: { status: "not-connected" | "error" }) {
  if (status === "not-connected") {
    return (
      <p className={`${cardClass} text-sm text-muted`}>
        Google Analytics is not connected. Set GA4_PROPERTY_ID, GA4_CLIENT_EMAIL and GA4_PRIVATE_KEY to see reports here.
      </p>
    );
  }
  return (
    <p className={`${cardClass} text-sm text-red-600`}>
      Analytics could not be loaded from Google Analytics. Check the GA4 settings and try again.
    </p>
  );
}
