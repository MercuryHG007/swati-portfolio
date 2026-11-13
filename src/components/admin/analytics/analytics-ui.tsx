import Link from "next/link";
import type { ReactNode } from "react";
import { cardClass } from "@/components/admin/ui";
import {
  describeChange,
  formatDayLabel,
  type ArtworkStat,
  type Count,
  type Kpi,
  type TrendPoint,
} from "@/lib/analytics-dashboard";

const numberFormatter = new Intl.NumberFormat("en-IN");

export function formatCount(value: number): string {
  return numberFormatter.format(value);
}

export function formatKpi(kpi: Kpi): string {
  if (kpi.format === "percent") return `${(kpi.value * 100).toFixed(1)}%`;
  return formatCount(kpi.value);
}

export function Group({
  title,
  columns = "md:grid-cols-2",
  children,
}: {
  title: string;
  columns?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className={`grid grid-cols-1 gap-4 ${columns}`}>{children}</div>
    </section>
  );
}

export function HighlightCard({
  label,
  value,
  detail,
  href,
}: {
  label: string;
  value: string;
  detail: string;
  href: string;
}) {
  return (
    <Link href={href} className={`${cardClass} flex flex-col gap-1 hover:border-accent`}>
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="truncate text-lg font-semibold text-foreground">{value}</p>
      <p className="text-sm text-muted">{detail}</p>
    </Link>
  );
}

export function StatCard({ kpi }: { kpi: Kpi }) {
  const change = describeChange(kpi);
  const toneClass = change.tone === "up" ? "text-emerald-700" : change.tone === "down" ? "text-red-600" : "text-muted";
  return (
    <div className={cardClass}>
      <p className="text-2xl font-semibold text-foreground">{formatKpi(kpi)}</p>
      <p className="text-sm text-muted">{kpi.label}</p>
      <p className={`mt-1 text-xs ${toneClass}`}>{change.text}</p>
    </div>
  );
}

export function BreakdownCard({
  title,
  labelHeader,
  valueHeader = "Count",
  rows,
  empty,
}: {
  title: string;
  labelHeader: string;
  valueHeader?: string;
  rows: Count[];
  empty: string;
}) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return (
    <section className={`${cardClass} flex flex-col gap-3`}>
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-1 font-normal">{labelHeader}</th>
              <th className="py-1 text-right font-normal">{valueHeader}</th>
              <th className="py-1 text-right font-normal">Share</th>
            </tr>
          </thead>
          <tbody className="text-foreground">
            {rows.map((row, index) => (
              <tr key={`${row.label}-${index}`} className="border-t border-border">
                <td className="max-w-0 truncate py-2 pr-3" title={row.label}>
                  {row.label}
                </td>
                <td className="py-2 text-right tabular-nums">{numberFormatter.format(row.value)}</td>
                <td className="py-2 text-right tabular-nums text-muted">
                  {total > 0 ? `${Math.round((row.value / total) * 100)}%` : "–"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export function ArtworkTable({ rows, empty }: { rows: ArtworkStat[]; empty: string }) {
  if (rows.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-muted">
        <tr>
          <th className="py-1 font-normal">Artwork</th>
          <th className="py-1 text-right font-normal">Views</th>
          <th className="py-1 text-right font-normal">Enquiries</th>
          <th className="py-1 text-right font-normal">Status</th>
        </tr>
      </thead>
      <tbody className="text-foreground">
        {rows.map((artwork) => (
          <tr key={artwork.slug} className="border-t border-border">
            <td className="max-w-0 py-2 pr-3">
              <p className="truncate">{artwork.title}</p>
              <p className="truncate text-xs text-muted">
                {artwork.medium} · {artwork.series}
              </p>
            </td>
            <td className="py-2 text-right tabular-nums">{numberFormatter.format(artwork.views)}</td>
            <td className="py-2 text-right tabular-nums">{numberFormatter.format(artwork.enquiries)}</td>
            <td className="py-2 text-right text-xs text-muted">
              {artwork.status === null ? "Removed" : artwork.status === "published" ? "Published" : "Hidden"}
              {artwork.availability ? ` · ${artwork.availability === "sold" ? "Sold" : "Available"}` : ""}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function TrendChart({ points }: { points: TrendPoint[] }) {
  const width = 600;
  const height = 140;
  const labelSpace = 20;
  const peak = Math.max(1, ...points.map((point) => point.sessions));
  const slot = width / Math.max(points.length, 1);
  const barWidth = Math.max(slot * 0.7, 1);
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <div className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${width} ${height + labelSpace}`} className="w-full" role="img" aria-label="Daily sessions and enquiries">
        {points.map((point, index) => {
          const barHeight = (point.sessions / peak) * height;
          const x = index * slot + (slot - barWidth) / 2;
          return (
            <g key={point.date}>
              <rect x={x} y={height - barHeight} width={barWidth} height={barHeight} className="fill-accent/70">
                <title>
                  {`${formatDayLabel(point.date)}: ${point.sessions} sessions, ${point.pageViews} page views, ${point.enquiries} enquiries`}
                </title>
              </rect>
              {point.enquiries > 0 ? (
                <circle cx={x + barWidth / 2} cy={Math.max(height - barHeight - 6, 6)} r={4} className="fill-red-500" />
              ) : null}
            </g>
          );
        })}
        {first ? (
          <text x={0} y={height + 15} className="fill-muted text-[12px]">
            {formatDayLabel(first.date)}
          </text>
        ) : null}
        {last ? (
          <text x={width} y={height + 15} textAnchor="end" className="fill-muted text-[12px]">
            {formatDayLabel(last.date)}
          </text>
        ) : null}
      </svg>
      <p className="text-xs text-muted">Bars show daily sessions. Red dots mark days with an enquiry.</p>
    </div>
  );
}

export function Funnel({ steps }: { steps: Count[] }) {
  const top = Math.max(1, steps[0]?.value ?? 1);
  return (
    <ol className="flex flex-col gap-3">
      {steps.map((step, index) => {
        const previous = index === 0 ? null : steps[index - 1].value;
        return (
          <li key={step.label} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-foreground">{step.label}</span>
              <span className="tabular-nums text-foreground">
                {numberFormatter.format(step.value)}
                {previous !== null ? (
                  <span className="ml-2 text-xs text-muted">
                    {previous > 0 ? `${Math.round((step.value / previous) * 100)}% of previous` : "no earlier steps"}
                  </span>
                ) : null}
              </span>
            </div>
            <div className="h-2 rounded bg-border">
              <div className="h-2 rounded bg-accent" style={{ width: `${Math.min(100, (step.value / top) * 100)}%` }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
