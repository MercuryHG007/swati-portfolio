// Exhibition dates are month-precision and stored as the first of the month at UTC midnight,
// so they're formatted in UTC to avoid showing the previous month in western time zones.
const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
const monthOnlyFormatter = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });

// Dates are stored at UTC midnight, so the year is read in UTC. Local time would show the previous year in western time zones.
export function getYear(date?: Date | string | null) {
  if (!date) return undefined;
  return new Date(date).getUTCFullYear();
}

export function formatDimensions(dimensions?: { height?: number; width?: number; unit?: string } | null) {
  if (!dimensions?.height || !dimensions?.width) return null;
  const { height, width, unit = "cm" } = dimensions;
  const unitLabel = unit === "in" ? "inch" : unit;
  return `${height} × ${width} ${unitLabel}`;
}

// Returns null when the size is unknown, so older images without a stored size show nothing.
export function formatFileSize(bytes?: number | null) {
  if (!bytes || bytes <= 0) return null;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatDateRange(start: Date | string, end?: Date | string | null) {
  const startDate = new Date(start);
  if (!end) return monthFormatter.format(startDate);

  const endDate = new Date(end);
  const sameMonth = monthFormatter.format(startDate) === monthFormatter.format(endDate);
  if (sameMonth) return monthFormatter.format(startDate);

  const sameYear = startDate.getUTCFullYear() === endDate.getUTCFullYear();
  const startLabel = sameYear ? monthOnlyFormatter.format(startDate) : monthFormatter.format(startDate);

  return `${startLabel} – ${monthFormatter.format(endDate)}`;
}
