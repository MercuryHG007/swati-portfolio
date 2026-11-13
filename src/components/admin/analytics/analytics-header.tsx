import Link from "next/link";
import { cardClass } from "@/components/admin/ui";
import { RangeSelector } from "@/components/admin/analytics/analytics-ui";
import type { RangeDays } from "@/lib/analytics-dashboard";

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
        <RangeSelector current={days} basePath={active.href} />
      </div>
      <nav aria-label="Analytics sections" className="flex flex-wrap gap-2 border-b border-border pb-3 text-sm">
        {ANALYTICS_SECTIONS.map((item) => (
          <Link
            key={item.key}
            href={`${item.href}?range=${days}`}
            aria-current={item.key === active.key ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 ${
              item.key === active.key ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
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
