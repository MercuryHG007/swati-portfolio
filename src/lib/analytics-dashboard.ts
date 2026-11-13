import { connectToDatabase } from "@/lib/mongodb";
import { Artwork, ContactMessage } from "@/models";
import {
  named,
  reportRanges,
  runReports,
  TRACKED_EVENTS,
  type DateRange,
  type Ga4Config,
  type ReportBody,
  type ReportRow,
} from "@/lib/ga4";

export const RANGE_DAYS = [7, 28, 90] as const;
export type RangeDays = (typeof RANGE_DAYS)[number];
const DEFAULT_RANGE_DAYS: RangeDays = 28;

export function parseRangeDays(value: string | undefined): RangeDays {
  const days = Number(value);
  return RANGE_DAYS.find((option) => option === days) ?? DEFAULT_RANGE_DAYS;
}

export interface Count {
  label: string;
  value: number;
}

export interface Kpi {
  label: string;
  value: number;
  previous: number;
  format: "count" | "percent";
}

export interface ArtworkStat {
  slug: string;
  title: string;
  medium: string;
  series: string;
  subjects: string[];
  views: number;
  enquiries: number;
  status: string | null;
  availability: string | null;
}

export interface AvailabilityStat {
  label: string;
  artworks: number;
  views: number;
}

export interface TrendPoint {
  date: string;
  sessions: number;
  pageViews: number;
  enquiries: number;
}

export interface AnalyticsDashboard {
  days: RangeDays;
  kpis: Kpi[];
  trend: TrendPoint[];
  funnel: Count[];
  enquiries: {
    total: number;
    // Form sends that GA4 recorded, to compare against the stored enquiries.
    ga4FormSends: number;
    byArtwork: Count[];
    bySource: Count[];
  };
  channels: Count[];
  sourceMedium: Count[];
  campaigns: Count[];
  landingPages: Count[];
  devices: Count[];
  countries: Count[];
  newVsReturning: Count[];
  pageTypes: Count[];
  topPages: Count[];
  topArtworks: ArtworkStat[];
  viewedNotEnquired: ArtworkStat[];
  availability: AvailabilityStat[];
  byMedium: Count[];
  bySeries: Count[];
  bySubject: Count[];
}

interface Totals {
  activeUsers: number;
  sessions: number;
  pageViews: number;
  engagementRate: number;
}

interface ArtworkDoc {
  title: string;
  slug: string;
  status: string;
  availability: string | null;
  medium?: { name: string } | null;
  series?: { title: string } | null;
  subjects?: { name: string }[];
}

interface LeadDoc {
  createdAt: Date;
  source?: {
    artworkSlug?: string;
    utmSource?: string;
    utmMedium?: string;
    referrer?: string;
  } | null;
}

const TIME_ZONE = "Asia/Kolkata";
const DAY_MS = 24 * 60 * 60 * 1000;
const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const dayLabelFormatter = new Intl.DateTimeFormat("en-IN", { timeZone: TIME_ZONE, day: "numeric", month: "short" });

// India has no DST, so a fixed +05:30 offset keeps day boundaries exact.
function dayKeyDaysAgo(daysAgo: number, now: number): string {
  return dayKeyFormatter.format(new Date(now - daysAgo * DAY_MS));
}

function startOfDayKey(key: string): Date {
  return new Date(`${key}T00:00:00+05:30`);
}

export function formatDayLabel(key: string): string {
  return dayLabelFormatter.format(startOfDayKey(key));
}

export async function getAnalyticsDashboard(config: Ga4Config, days: RangeDays): Promise<AnalyticsDashboard> {
  const now = Date.now();
  const { current, previous } = reportRanges(days);
  const dayKeys = Array.from({ length: days }, (_, index) => dayKeyDaysAgo(days - 1 - index, now));
  const currentStart = startOfDayKey(dayKeyDaysAgo(days - 1, now));
  const previousStart = startOfDayKey(dayKeyDaysAgo(days * 2 - 1, now));

  const [reports, leads, docs] = await Promise.all([
    runReports(config, buildReportBodies(current, previous)),
    loadLeads(previousStart),
    loadArtworks(),
  ]);
  const [
    currentTotalRows,
    previousTotalRows,
    currentEventRows,
    trend,
    channels,
    sourceMedium,
    campaigns,
    landingPages,
    devices,
    countries,
    newVsReturning,
    pages,
    items,
  ] = reports;

  const currentTotals = totalsFor(currentTotalRows);
  const previousTotals = totalsFor(previousTotalRows);


  const currentLeads = leads.filter((lead) => lead.createdAt >= currentStart);
  const previousLeadCount = leads.length - currentLeads.length;
  const enquiriesByDay = new Map(tally(currentLeads, (lead) => dayKeyFormatter.format(lead.createdAt)).map(toEntry));
  const enquiriesBySlug = new Map(tally(currentLeads, (lead) => lead.source?.artworkSlug).map(toEntry));
  const docsBySlug = new Map(docs.map((doc): [string, ArtworkDoc] => [doc.slug, doc]));

  const artworks = buildArtworkStats(items, docsBySlug, enquiriesBySlug);
  const pageViews = pages.map((row) => ({ path: row.dimensions[0] ?? "", views: row.metrics[0] ?? 0 }));
  const contactPageViews = pageViews.find((page) => page.path === "/contact")?.views ?? 0;
  const itemViews = eventCount(currentEventRows, "view_item");
  const instagramClicks = eventCount(currentEventRows, "contact_click");

  const trendByDay = new Map(
    trend.map((row): [string, { sessions: number; pageViews: number }] => [
      isoDayFromGa4(row.dimensions[0] ?? ""),
      { sessions: row.metrics[0] ?? 0, pageViews: row.metrics[1] ?? 0 },
    ]),
  );

  return {
    days,
    kpis: [
      { label: "Active users", value: currentTotals.activeUsers, previous: previousTotals.activeUsers, format: "count" },
      { label: "Sessions", value: currentTotals.sessions, previous: previousTotals.sessions, format: "count" },
      { label: "Page views", value: currentTotals.pageViews, previous: previousTotals.pageViews, format: "count" },
      {
        label: "Engagement rate",
        value: currentTotals.engagementRate,
        previous: previousTotals.engagementRate,
        format: "percent",
      },
      { label: "Enquiries", value: currentLeads.length, previous: previousLeadCount, format: "count" },
      {
        label: "Enquiry rate",
        value: ratio(currentLeads.length, currentTotals.sessions),
        previous: ratio(previousLeadCount, previousTotals.sessions),
        format: "percent",
      },
    ],
    trend: dayKeys.map((date) => ({
      date,
      sessions: trendByDay.get(date)?.sessions ?? 0,
      pageViews: trendByDay.get(date)?.pageViews ?? 0,
      enquiries: enquiriesByDay.get(date) ?? 0,
    })),
    funnel: [
      { label: "Sessions", value: currentTotals.sessions },
      { label: "Artwork views", value: itemViews },
      { label: "Contact page views", value: contactPageViews },
      { label: "Instagram clicks", value: instagramClicks },
      { label: "Enquiries sent", value: currentLeads.length },
    ],
    enquiries: {
      total: currentLeads.length,
      ga4FormSends: eventCount(currentEventRows, "generate_lead"),
      byArtwork: sortCounts(
        [...enquiriesBySlug].map(([slug, value]) => ({ label: docsBySlug.get(slug)?.title ?? slug, value })),
        8,
      ),
      bySource: tally(currentLeads, (lead) => sourceLabel(lead.source)),
    },
    channels: toCounts(channels),
    sourceMedium: toCounts(sourceMedium),
    campaigns: toCounts(campaigns),
    landingPages: toCounts(landingPages),
    devices: toCounts(devices),
    countries: toCounts(countries),
    newVsReturning: toCounts(newVsReturning),
    pageTypes: tally(pageViews, (page) => pageTypeOf(page.path), (page) => page.views),
    topPages: sortCounts(pageViews.map((page) => ({ label: page.path, value: page.views })), 10),
    topArtworks: artworks.slice(0, 10),
    viewedNotEnquired: artworks
      .filter((artwork) => artwork.status === "published" && artwork.enquiries === 0 && artwork.availability !== "sold")
      .slice(0, 10),
    availability: ["Available", "Sold", "Not set"].map((label) => {
      const matching = artworks.filter((artwork) => availabilityLabel(artwork) === label);
      return {
        label,
        artworks: matching.length,
        views: matching.reduce((sum, artwork) => sum + artwork.views, 0),
      };
    }),
    byMedium: tally(artworks, (artwork) => artwork.medium, (artwork) => artwork.views),
    bySeries: tally(artworks, (artwork) => artwork.series, (artwork) => artwork.views),
    bySubject: tally(
      artworks.flatMap((artwork) => artwork.subjects.map((subject) => ({ subject, views: artwork.views }))),
      (entry) => entry.subject,
      (entry) => entry.views,
    ),
  };
}

// Percent KPIs compare in percentage points; counts compare as a percentage change.
export function describeChange(kpi: Kpi): { text: string; tone: "up" | "down" | "flat" } {
  if (kpi.format === "percent") {
    const points = (kpi.value - kpi.previous) * 100;
    return { text: `${signed(points.toFixed(1))} pts vs previous`, tone: toneOf(points) };
  }
  if (kpi.previous === 0) {
    return kpi.value === 0
      ? { text: "No change vs previous", tone: "flat" }
      : { text: "New vs previous", tone: "up" };
  }
  const percent = ((kpi.value - kpi.previous) / kpi.previous) * 100;
  return { text: `${signed(Math.round(percent))}% vs previous`, tone: toneOf(percent) };
}

function buildReportBodies(current: DateRange, previous: DateRange): ReportBody[] {
  const currentOnly = [current];
  const breakdown = (dimension: string, metric: string, limit: number): ReportBody => ({
    dateRanges: currentOnly,
    dimensions: named(dimension),
    metrics: named(metric),
    orderBys: [{ metric: { metricName: metric }, desc: true }],
    limit,
  });

  const totalsBody = (range: DateRange): ReportBody => ({
    dateRanges: [range],
    metrics: named("activeUsers", "sessions", "screenPageViews", "engagementRate"),
  });

  return [
    // One request per period keeps each row's shape fixed; no implicit dateRange dimension is needed.
    totalsBody(current),
    totalsBody(previous),
    {
      dateRanges: currentOnly,
      dimensions: named("eventName"),
      metrics: named("eventCount"),
      dimensionFilter: { filter: { fieldName: "eventName", inListFilter: { values: TRACKED_EVENTS } } },
    },
    {
      dateRanges: currentOnly,
      dimensions: named("date"),
      metrics: named("sessions", "screenPageViews"),
      orderBys: [{ dimension: { dimensionName: "date" } }],
      limit: 500,
    },
    breakdown("sessionDefaultChannelGroup", "sessions", 10),
    breakdown("sessionSourceMedium", "sessions", 10),
    breakdown("sessionCampaignName", "sessions", 10),
    breakdown("landingPage", "sessions", 10),
    breakdown("deviceCategory", "activeUsers", 10),
    breakdown("country", "activeUsers", 10),
    breakdown("newVsReturning", "activeUsers", 5),
    // Large limit so pages can be grouped by type after fetching.
    breakdown("pagePath", "screenPageViews", 500),
    {
      dateRanges: currentOnly,
      dimensions: named("itemId", "itemName", "itemCategory", "itemCategory2"),
      metrics: named("itemsViewed"),
      orderBys: [{ metric: { metricName: "itemsViewed" }, desc: true }],
      limit: 500,
    },
  ];
}

function buildArtworkStats(
  items: ReportRow[],
  docsBySlug: Map<string, ArtworkDoc>,
  enquiriesBySlug: Map<string, number>,
): ArtworkStat[] {
  const totals = new Map<string, { name: string; medium: string; series: string; views: number }>();
  for (const row of items) {
    const [slug = "", name = "", medium = "", series = ""] = row.dimensions;
    if (!slug || slug === "(not set)") continue;
    const entry = totals.get(slug) ?? { name, medium, series, views: 0 };
    entry.views += row.metrics[0] ?? 0;
    totals.set(slug, entry);
  }

  return [...totals]
    .map(([slug, entry]): ArtworkStat => {
      const doc = docsBySlug.get(slug);
      return {
        slug,
        title: doc?.title ?? (entry.name || slug),
        medium: doc?.medium?.name ?? (cleanItemValue(entry.medium) || "Not set"),
        series: doc?.series?.title ?? (cleanItemValue(entry.series) || "Not in a series"),
        subjects: doc?.subjects?.map((subject) => subject.name) ?? [],
        views: entry.views,
        enquiries: enquiriesBySlug.get(slug) ?? 0,
        status: doc?.status ?? null,
        availability: doc ? (doc.availability ?? null) : null,
      };
    })
    .sort((a, b) => b.views - a.views);
}

function availabilityLabel(artwork: ArtworkStat): string | null {
  if (artwork.status === null) return null;
  if (artwork.availability === "sold") return "Sold";
  if (artwork.availability === "available") return "Available";
  return "Not set";
}

export function pageTypeOf(path: string): string {
  if (path === "/") return "Home";
  if (path.startsWith("/artwork/")) return "Artwork";
  if (path.startsWith("/series")) return "Series";
  if (path.startsWith("/exhibitions")) return "Exhibitions";
  if (path.startsWith("/portfolio")) return "Portfolio";
  if (path === "/contact") return "Contact";
  if (path === "/about") return "About";
  if (path === "/privacy") return "Privacy";
  return "Other";
}

function sourceLabel(source: LeadDoc["source"]): string {
  if (!source) return "Unknown";
  if (source.utmSource) {
    return source.utmMedium ? `${source.utmSource} / ${source.utmMedium}` : source.utmSource;
  }
  if (source.referrer) return referrerHost(source.referrer);
  return "Direct";
}

function referrerHost(referrer: string): string {
  try {
    return new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return "Other referrer";
  }
}

// Groups items by a key, summing `amountOf` (default: one per item). Missing keys are skipped.
function tally<T>(
  items: T[],
  keyOf: (item: T) => string | null | undefined,
  amountOf: (item: T) => number = () => 1,
): Count[] {
  const totals = new Map<string, number>();
  for (const item of items) {
    const key = keyOf(item);
    if (!key) continue;
    totals.set(key, (totals.get(key) ?? 0) + amountOf(item));
  }
  return sortCounts([...totals].map(([label, value]) => ({ label, value })));
}

function toEntry(count: Count): [string, number] {
  return [count.label, count.value];
}

function toCounts(rows: ReportRow[]): Count[] {
  return sortCounts(rows.map((row) => ({ label: displayLabel(row.dimensions[0]), value: row.metrics[0] ?? 0 })));
}

function sortCounts(counts: Count[], limit = counts.length): Count[] {
  return [...counts].sort((a, b) => b.value - a.value).slice(0, limit);
}

// GA4 reports missing values as "(not set)" and grouped tails as "(other)".
function displayLabel(raw: string | undefined): string {
  if (!raw || raw === "(not set)") return "Not set";
  if (raw === "(other)") return "Other";
  return raw;
}

function cleanItemValue(raw: string): string {
  return raw === "(not set)" ? "" : raw;
}

function totalsFor(rows: ReportRow[]): Totals {
  const metrics = rows[0]?.metrics ?? [];
  return {
    activeUsers: metrics[0] ?? 0,
    sessions: metrics[1] ?? 0,
    pageViews: metrics[2] ?? 0,
    engagementRate: metrics[3] ?? 0,
  };
}

function eventCount(rows: ReportRow[], eventName: string): number {
  return rows.find((row) => row.dimensions[0] === eventName)?.metrics[0] ?? 0;
}

// GA4 returns dates as YYYYMMDD; the rest of the app uses YYYY-MM-DD.
function isoDayFromGa4(raw: string): string {
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

function ratio(part: number, whole: number): number {
  return whole > 0 ? part / whole : 0;
}

function toneOf(change: number): "up" | "down" | "flat" {
  if (Math.abs(change) < 0.05) return "flat";
  return change > 0 ? "up" : "down";
}

function signed(value: number | string): string {
  const text = String(value);
  return Number(value) > 0 ? `+${text}` : text;
}

// Only fields the dashboard needs: no names, emails or messages leave the database here.
async function loadLeads(since: Date): Promise<LeadDoc[]> {
  await connectToDatabase();
  const docs = await ContactMessage.find({ createdAt: { $gte: since } })
    .select("createdAt source")
    .lean();
  return docs as unknown as LeadDoc[];
}

async function loadArtworks(): Promise<ArtworkDoc[]> {
  await connectToDatabase();
  const docs = await Artwork.find({})
    .select("title slug status availability medium series subjects")
    .populate("medium", "name")
    .populate("series", "title")
    .populate("subjects", "name")
    .lean();
  return docs as unknown as ArtworkDoc[];
}
