import { Breadcrumbs } from "@/components/breadcrumbs";
import { ExhibitionList } from "@/components/exhibition-list";
import { getPublishedExhibitions } from "@/lib/queries";

export const revalidate = 60;

export default async function ExhibitionsPage() {
  const exhibitions = await getPublishedExhibitions();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-16">
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
