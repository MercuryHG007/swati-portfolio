import type { AnalyticsDashboard } from "@/lib/analytics-dashboard";

// Only aggregate numbers and artwork titles go to the model. Enquiry names, emails and messages never leave the database.
export function buildAnalyticsSummaryPrompt(dashboard: AnalyticsDashboard): string {
  const data = {
    periodDays: dashboard.days,
    kpis: dashboard.kpis.map((kpi) => ({
      label: kpi.label,
      current: kpi.value,
      previous: kpi.previous,
      format: kpi.format,
    })),
    funnel: dashboard.funnel,
    topChannels: dashboard.channels.slice(0, 5),
    topSourceMedium: dashboard.sourceMedium.slice(0, 5),
    pageTypes: dashboard.pageTypes,
    devices: dashboard.devices,
    topArtworks: dashboard.topArtworks.slice(0, 5).map((artwork) => ({
      title: artwork.title,
      views: artwork.views,
      enquiries: artwork.enquiries,
    })),
    viewedButNotEnquired: dashboard.viewedNotEnquired.slice(0, 5).map((artwork) => ({
      title: artwork.title,
      views: artwork.views,
    })),
    viewsByMedium: dashboard.byMedium.slice(0, 5),
    availability: dashboard.availability,
  };

  return [
    "You review visitor analytics for an artist's portfolio website.",
    "Use only the data below. Do not invent figures, and do not mention data that is not listed.",
    "Write 3 to 5 short observations. Each is one line starting with '- ', followed by one concrete suggestion for the artist.",
    "",
    "Data (JSON):",
    JSON.stringify(data),
  ].join("\n");
}
