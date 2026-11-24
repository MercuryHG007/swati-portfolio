import { describe, expect, it } from "vitest";
import type { AnalyticsDashboard } from "./analytics-dashboard";
import { buildAnalyticsSummaryPrompt } from "./analytics-summary";

const count = (index: number) => ({ label: `Item ${index}`, value: index });
const artwork = (index: number) => ({
  slug: `art-${index}`,
  title: `Art ${index}`,
  medium: "Oil",
  series: "",
  subjects: [],
  views: index,
  enquiries: 0,
  status: null,
  availability: null,
});
const manyCounts = Array.from({ length: 8 }, (_, index) => count(index + 1));
const manyArtworks = Array.from({ length: 8 }, (_, index) => artwork(index + 1));

// Only the fields the summary reads are filled in.
const dashboard = {
  days: 28,
  kpis: [{ label: "Sessions", value: 120, previous: 100, format: "count" }],
  funnel: manyCounts,
  channels: manyCounts,
  sourceMedium: manyCounts,
  pageTypes: manyCounts,
  devices: manyCounts,
  topArtworks: manyArtworks,
  viewedNotEnquired: manyArtworks,
  byMedium: manyCounts,
  availability: [],
  enquiries: { total: 3, ga4FormSends: 3, byArtwork: manyCounts, bySource: manyCounts },
} as unknown as AnalyticsDashboard;

function dataFrom(prompt: string) {
  const json = prompt.split("Data (JSON):\n")[1];
  return JSON.parse(json);
}

describe("buildAnalyticsSummaryPrompt", () => {
  it("asks for 3 to 5 observations, each with one suggestion", () => {
    expect(buildAnalyticsSummaryPrompt(dashboard)).toContain("Write 3 to 5 short observations.");
  });

  it("sends the period and KPIs", () => {
    const data = dataFrom(buildAnalyticsSummaryPrompt(dashboard));
    expect(data.periodDays).toBe(28);
    expect(data.kpis).toEqual([{ label: "Sessions", current: 120, previous: 100, format: "count" }]);
  });

  it("limits ranked lists to the top five", () => {
    const data = dataFrom(buildAnalyticsSummaryPrompt(dashboard));
    expect(data.topChannels).toHaveLength(5);
    expect(data.topSourceMedium).toHaveLength(5);
    expect(data.topArtworks).toHaveLength(5);
    expect(data.viewedButNotEnquired).toHaveLength(5);
    expect(data.viewsByMedium).toHaveLength(5);
  });

  it("sends only artwork title, views and enquiries, not enquiry details", () => {
    const data = dataFrom(buildAnalyticsSummaryPrompt(dashboard));
    expect(Object.keys(data.topArtworks[0]).sort()).toEqual(["enquiries", "title", "views"]);
    expect(data).not.toHaveProperty("enquiries");
  });
});
