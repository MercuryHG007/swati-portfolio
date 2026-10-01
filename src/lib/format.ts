const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export function getYear(date?: Date | string | null) {
  if (!date) return undefined;
  return new Date(date).getFullYear();
}

export function formatDateRange(start: Date | string, end?: Date | string | null) {
  const startDate = new Date(start);
  if (!end) return formatter.format(startDate);

  const endDate = new Date(end);
  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  const startLabel = sameYear
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(startDate)
    : formatter.format(startDate);

  return `${startLabel} – ${formatter.format(endDate)}`;
}
