import Link from "next/link";
import { ProtectedImage } from "@/components/cloudinary-image";
import { getPublishedExhibitions } from "@/lib/queries";
import { formatDateRange } from "@/lib/format";

export const revalidate = 60;

export default async function ExhibitionsPage() {
  const exhibitions = await getPublishedExhibitions();
  // Wall-clock split is intentional here: the page revalidates every 60s (ISR),
  // so this bucketing is recomputed on each revalidation, not frozen at build time.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const current = exhibitions.filter((e) => !e.endDate || new Date(e.endDate).getTime() >= now);
  const past = exhibitions.filter((e) => e.endDate && new Date(e.endDate).getTime() < now);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-6 py-16">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold text-foreground">Exhibitions</h1>
        <p className="max-w-2xl text-muted">Solo and group shows, past and upcoming.</p>
      </header>

      {exhibitions.length === 0 ? (
        <p className="text-muted">No exhibitions to show yet.</p>
      ) : (
        <>
          {current.length > 0 && (
            <section className="flex flex-col gap-6">
              <h2 className="text-lg font-semibold text-foreground">Current &amp; upcoming</h2>
              <ExhibitionGrid exhibitions={current} />
            </section>
          )}
          {past.length > 0 && (
            <section className="flex flex-col gap-6">
              <h2 className="text-lg font-semibold text-foreground">Past</h2>
              <ExhibitionGrid exhibitions={past} />
            </section>
          )}
        </>
      )}
    </main>
  );
}

type ExhibitionListItem = {
  slug: string;
  title: string;
  venue: string;
  city?: string;
  country?: string;
  startDate: Date | string;
  endDate?: Date | string | null;
  images?: { publicId: string; alt?: string }[];
};

function ExhibitionGrid({ exhibitions }: { exhibitions: ExhibitionListItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
      {exhibitions.map((exhibition) => {
        const location = [exhibition.city, exhibition.country].filter(Boolean).join(", ");
        const image = exhibition.images?.[0];
        return (
          <Link key={exhibition.slug} href={`/exhibitions/${exhibition.slug}`} className="group block">
            <div className="relative aspect-[16/10] overflow-hidden rounded-md bg-surface">
              {image ? (
                <ProtectedImage
                  src={image.publicId}
                  alt={image.alt || exhibition.title}
                  fill
                  crop="fill"
                  gravity="auto"
                  sizes="(min-width: 640px) 50vw, 100vw"
                  className="object-cover transition duration-300 group-hover:scale-105"
                />
              ) : null}
            </div>
            <h3 className="mt-3 text-base font-semibold text-foreground">{exhibition.title}</h3>
            <p className="mt-1 text-sm text-muted">
              {exhibition.venue}
              {location ? `, ${location}` : ""}
            </p>
            <p className="text-sm text-muted">{formatDateRange(exhibition.startDate, exhibition.endDate)}</p>
          </Link>
        );
      })}
    </div>
  );
}
