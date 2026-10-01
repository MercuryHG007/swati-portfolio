import { notFound } from "next/navigation";
import { ProtectedImage } from "@/components/cloudinary-image";
import { getExhibitionBySlug, getPublishedExhibitions } from "@/lib/queries";
import { formatDateRange } from "@/lib/format";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PrevNextNav } from "@/components/prev-next-nav";
import { getPrevNext } from "@/lib/prev-next";

export const revalidate = 60;

export default async function ExhibitionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const exhibition = await getExhibitionBySlug(slug);
  if (!exhibition) notFound();

  const allExhibitions = await getPublishedExhibitions();
  const currentIndex = allExhibitions.findIndex((e) => e.slug === slug);
  const siblings = getPrevNext(allExhibitions, currentIndex);

  const location = [exhibition.city, exhibition.country].filter(Boolean).join(", ");

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-16">
      <Breadcrumbs items={[{ label: "Exhibitions", href: "/exhibitions" }, { label: exhibition.title }]} />
      <header className="flex flex-col gap-3">
        <p className="font-mono text-xs uppercase tracking-wide text-accent">
          {exhibition.type === "solo" ? "Solo exhibition" : "Group exhibition"}
        </p>
        <h1 className="text-3xl font-semibold text-foreground">{exhibition.title}</h1>
        <p className="text-muted">
          {exhibition.venue}
          {location ? `, ${location}` : ""}
        </p>
        <p className="text-muted">{formatDateRange(exhibition.startDate, exhibition.endDate)}</p>
      </header>

      {exhibition.description ? <p className="max-w-2xl text-muted">{exhibition.description}</p> : null}

      {exhibition.images?.length > 0 ? (
        <div className="flex flex-col gap-6">
          {exhibition.images.map((image: { publicId: string; alt?: string; width: number; height: number }) => (
            <ProtectedImage
              key={image.publicId}
              src={image.publicId}
              alt={image.alt || exhibition.title}
              width={image.width}
              height={image.height}
              sizes="(min-width: 768px) 768px, 100vw"
              className="h-auto w-full rounded-md"
            />
          ))}
        </div>
      ) : null}

      <PrevNextNav
        prev={siblings?.prev ? { href: `/exhibitions/${siblings.prev.slug}`, label: siblings.prev.title } : null}
        next={siblings?.next ? { href: `/exhibitions/${siblings.next.slug}`, label: siblings.next.title } : null}
      />
    </main>
  );
}
