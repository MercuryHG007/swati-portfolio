import { TextLink } from "@/components/text-link/text-link";
import { formatDateRange, getYear } from "@/lib/format";

export type ExhibitionListItem = {
  slug: string;
  title: string;
  venue: string;
  city?: string;
  country?: string;
  startDate: Date | string;
  endDate?: Date | string | null;
};

export function ExhibitionList({ exhibitions }: { exhibitions: ExhibitionListItem[] }) {
  return (
    <ul className="flex flex-col gap-10">
      {groupByYear(exhibitions).map(([year, items]) => (
        <li key={year} className="grid gap-1 md:grid-cols-[8rem_1fr]">
          <p className="text-sm text-muted">{year}</p>
          <ul className="flex flex-col gap-5">
            {items.map((exhibition) => {
              const venueLine = [exhibition.venue, exhibition.city, exhibition.country].filter(Boolean).join(", ");
              return (
                <li key={exhibition.slug} className="flex flex-col gap-1">
                  <TextLink href={`/exhibitions/${exhibition.slug}`} variant="inverse" className="w-fit text-foreground">
                    {exhibition.title}
                  </TextLink>
                  <p className="text-sm text-muted">
                    {venueLine} · {formatDateRange(exhibition.startDate, exhibition.endDate)}
                  </p>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}

// Input is already sorted newest-first by getPublishedExhibitions, so insertion order is kept within a year.
function groupByYear(items: ExhibitionListItem[]): [number, ExhibitionListItem[]][] {
  const groups = new Map<number, ExhibitionListItem[]>();
  for (const item of items) {
    const year = getYear(item.startDate);
    if (!year) continue;
    groups.set(year, [...(groups.get(year) ?? []), item]);
  }
  return [...groups.entries()].sort(([a], [b]) => b - a);
}
