import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ExhibitionList } from "@/components/exhibition-list";
import { getPublishedExhibitions } from "@/lib/queries";
import { JsonLd } from "@/components/json-ld";
import { collectionJsonLd, pageMetadata } from "@/lib/seo";
import { exhibitionsDescription } from "@/lib/descriptions";
import { getExhibitionsDescription } from "@/lib/site-copy";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Exhibitions — Swati Garg",
    description: await getExhibitionsDescription(),
    path: "/exhibitions",
  });
}

export default async function ExhibitionsPage() {
  const exhibitions = await getPublishedExhibitions();
  const [latest] = exhibitions;
  const description = exhibitionsDescription({
    count: exhibitions.length,
    latest: latest ? { title: latest.title, venue: latest.venue } : undefined,
  });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-16">
      <JsonLd data={collectionJsonLd({ name: "Exhibitions", description, path: "/exhibitions" })} />
      <Breadcrumbs items={[{ label: "Exhibitions" }]} />
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-medium text-foreground">Exhibitions</h1>
      </header>
      {exhibitions.length > 0 ? (
        <ExhibitionList exhibitions={exhibitions} />
      ) : (
        <p className="text-muted">No exhibitions yet.</p>
      )}
    </main>
  );
}
