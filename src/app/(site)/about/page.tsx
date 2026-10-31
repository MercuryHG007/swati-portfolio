import type { ReactNode } from "react";
import { Button } from "@/components/button/button";
import { TextLink } from "@/components/text-link/text-link";
import { ProtectedImage } from "@/components/cloudinary-image";
import { getAbout, getPublishedExhibitions } from "@/lib/queries";
import { formatDateRange, getYearUTC } from "@/lib/format";

export const revalidate = 60;

type CvEntry = { title: string; detail?: string; date?: string };

type ExhibitionItem = {
  slug: string;
  title: string;
  venue: string;
  city?: string;
  country?: string;
  startDate: Date | string;
  endDate?: Date | string | null;
};

export default async function AboutPage() {
  const [about, exhibitions] = await Promise.all([getAbout(), getPublishedExhibitions()]);

  const location = about?.location;
  const exhibitionsByYear = groupByYear(exhibitions);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-6 py-16">
      <header className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3">
          <h1 className="text-5xl font-medium leading-none tracking-tight text-foreground md:text-7xl">
            Swati Garg
          </h1>
          <p className="text-lg italic text-muted">
            Watercolor &amp; mixed media artist
            {location ? ` · Lives and works in ${location}` : ""}
          </p>
        </div>
        {about?.photo ? (
          <div className="relative h-40 w-40 shrink-0 overflow-hidden rounded-full bg-surface">
            <ProtectedImage
              src={about.photo.publicId}
              alt={about.photo.alt || "Swati Garg"}
              fill
              crop="fill"
              gravity="face"
              sizes="160px"
              className="object-cover"
            />
          </div>
        ) : null}
      </header>

      <div className="grid gap-16 md:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="flex flex-col gap-14">
          {about?.bio ? (
            <p className="max-w-2xl whitespace-pre-line text-lg leading-relaxed text-foreground">{about.bio}</p>
          ) : null}
          {about?.statement ? (
            <blockquote className="max-w-2xl border-l border-foreground pl-5 text-lg leading-relaxed text-foreground">
              {about.statement}
            </blockquote>
          ) : null}

          {about?.education?.length ? (
            <Section title="Education">
              <EntryList entries={about.education} />
            </Section>
          ) : null}

          {exhibitionsByYear.length > 0 ? (
            <Section title="Exhibitions">
              <ul className="flex flex-col gap-10">
                {exhibitionsByYear.map(([year, items]) => (
                  <li key={year} className="grid gap-1 md:grid-cols-[8rem_1fr]">
                    <p className="text-sm text-muted">{year}</p>
                    <ul className="flex flex-col gap-5">
                      {items.map((exhibition) => {
                        const venueLine = [exhibition.venue, exhibition.city, exhibition.country]
                          .filter(Boolean)
                          .join(", ");
                        return (
                          <li key={exhibition.slug} className="flex flex-col gap-1">
                            <TextLink
                              href={`/exhibitions/${exhibition.slug}`}
                              variant="inverse"
                              className="w-fit text-foreground"
                            >
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
            </Section>
          ) : null}

          {about?.awards?.length ? (
            <Section title="Awards">
              <EntryList entries={about.awards} />
            </Section>
          ) : null}

          {about?.achievements?.length ? (
            <Section title="Achievements">
              <EntryList entries={about.achievements} />
            </Section>
          ) : null}

          {about?.publicCollections?.length ? (
            <Section title="Public collections">
              <ul className="flex flex-col gap-2 text-foreground">
                {about.publicCollections.map((collection: string) => (
                  <li key={collection}>{collection}</li>
                ))}
              </ul>
            </Section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-10 text-sm md:sticky md:top-12 md:self-start">
          {about?.resumeUrl ? (
            <Button href={about.resumeUrl} variant="inverse" size="md">
              Download CV (PDF)
            </Button>
          ) : null}

          <div className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-widest text-muted">Contact</p>
            <TextLink href="/contact" variant="primary" className="w-fit text-foreground">
              Send a message
            </TextLink>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-6 border-t border-border pt-6">
      <h2 className="text-xs uppercase tracking-widest font-sans text-muted">{title}</h2>
      {children}
    </section>
  );
}

function EntryList({ entries }: { entries: CvEntry[] }) {
  return (
    <ul className="flex flex-col gap-5">
      {entries.map((entry, index) => (
        <li key={`${entry.title}-${index}`} className="grid gap-1 md:grid-cols-[8rem_1fr]">
          <p className="text-sm text-muted">{entry.date}</p>
          <div className="flex flex-col gap-1">
            <p className="text-foreground">{entry.title}</p>
            {entry.detail ? <p className="text-sm text-muted">{entry.detail}</p> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

// Input is already sorted newest-first by getPublishedExhibitions, so insertion order is kept within a year.
function groupByYear(items: ExhibitionItem[]): [number, ExhibitionItem[]][] {
  const groups = new Map<number, ExhibitionItem[]>();
  for (const item of items) {
    const year = getYearUTC(item.startDate);
    if (!year) continue;
    groups.set(year, [...(groups.get(year) ?? []), item]);
  }
  return [...groups.entries()].sort(([a], [b]) => b - a);
}
