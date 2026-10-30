// Exhibition dates are month-precision and stored as the first of the month at UTC midnight,
// so they're formatted in UTC to avoid showing the previous month in western time zones.
const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
const monthOnlyFormatter = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });

export function getYear(date?: Date | string | null) {
  if (!date) return undefined;
  return new Date(date).getFullYear();
}

export function getYearUTC(date?: Date | string | null) {
  if (!date) return undefined;
  return new Date(date).getUTCFullYear();
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
