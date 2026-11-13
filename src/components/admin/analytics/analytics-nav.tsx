"use client";

import Link from "next/link";
import { skipCurrentPageClick } from "@/components/current-page-click";
import type { RangeDays } from "@/lib/analytics-dashboard";

// Client component, so it takes plain values from the server header instead of importing the dashboard data layer.
type Tab = { key: string; label: string; href: string };

export function AnalyticsTabs({ tabs, activeKey, days }: { tabs: readonly Tab[]; activeKey: string; days: RangeDays }) {
  return (
    <nav aria-label="Analytics sections" className="flex flex-wrap gap-2 border-b border-border pb-3 text-sm">
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <Link
            key={tab.key}
            href={`${tab.href}?range=${days}`}
            aria-current={active ? "page" : undefined}
            onClick={skipCurrentPageClick(active)}
            className={`rounded-md px-3 py-1.5 ${
              active ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function RangeSelector({
  current,
  basePath,
  ranges,
}: {
  current: RangeDays;
  basePath: string;
  ranges: readonly RangeDays[];
}) {
  return (
    <nav aria-label="Date range" className="flex gap-1 rounded-md border border-border bg-surface p-1 text-sm">
      {ranges.map((days) => {
        const active = days === current;
        return (
          <Link
            key={days}
            href={`${basePath}?range=${days}`}
            aria-current={active ? "page" : undefined}
            onClick={skipCurrentPageClick(active)}
            className={`rounded px-3 py-1.5 ${
              active ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            {days} days
          </Link>
        );
      })}
    </nav>
  );
}
