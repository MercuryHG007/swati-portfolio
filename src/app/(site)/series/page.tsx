import Link from "next/link";
import { ProtectedImage } from "@/components/cloudinary-image";
import { getPublishedSeries } from "@/lib/queries";
import { CardTitle } from "@/components/card-title/card-title";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 60;

export const metadata = pageMetadata({
  title: "Series — Swati Garg",
  description: "Series of paintings by Swati Garg.",
  path: "/series",
});

export default async function SeriesIndexPage() {
  const series = await getPublishedSeries();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-16">
      <Breadcrumbs items={[{ label: "Portfolio", href: "/portfolio" }, { label: "Series" }]} />
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-medium text-foreground">Series</h1>
      </header>

      {series.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          {series.map((s, index) => (
            <Link key={s.slug} href={`/portfolio/series/${s.slug}`} className="group block">
              <div className="relative aspect-[16/10] overflow-hidden rounded-md bg-surface">
                {s.coverImage ? (
                  <ProtectedImage
                    src={s.coverImage.publicId}
                    alt={s.coverImage.alt || s.title}
                    fill
                    crop="fill"
                    gravity="auto"
                    sizes="(min-width: 640px) 50vw, 100vw"
                    className="scale-[1.05] object-cover transition duration-500 ease-out group-hover:scale-100 group-focus-visible:scale-100 motion-reduce:scale-100 motion-reduce:transition-none"
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                ) : null}
              </div>
              <h2 className="mt-3 font-sans text-base font-semibold text-foreground">
                <CardTitle>{s.title}</CardTitle>
              </h2>
              {s.description ? (
                <p className="mt-1 line-clamp-2 text-sm text-muted">{s.description}</p>
              ) : null}
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-muted">New series coming soon.</p>
      )}
    </main>
  );
}
