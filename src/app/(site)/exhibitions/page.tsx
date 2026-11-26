import { Breadcrumbs } from "@/components/breadcrumbs";
import { ExhibitionList } from "@/components/exhibition-list";
import { getPublishedExhibitions } from "@/lib/queries";
import { JsonLd } from "@/components/json-ld";
import { collectionJsonLd, pageMetadata } from "@/lib/seo";

export const revalidate = 60;

const EXHIBITIONS_DESCRIPTION =
  "Solo and group exhibitions featuring watercolor, acrylic, pencil and oil paintings by Swati Garg, with venues and dates for each show.";

export const metadata = pageMetadata({
  title: "Exhibitions — Swati Garg",
  description: EXHIBITIONS_DESCRIPTION,
  path: "/exhibitions",
});

export default async function ExhibitionsPage() {
  const exhibitions = await getPublishedExhibitions();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-16">
      <JsonLd
        data={collectionJsonLd({ name: "Exhibitions", description: EXHIBITIONS_DESCRIPTION, path: "/exhibitions" })}
      />
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
