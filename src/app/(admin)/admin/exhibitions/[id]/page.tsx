import Link from "next/link";
import { notFound } from "next/navigation";
import { getExhibitionById } from "@/lib/admin-queries";
import { ExhibitionForm } from "../exhibition-form";
import { updateExhibition } from "../actions";

export default async function EditExhibitionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const exhibition = await getExhibitionById(id);
  if (!exhibition) notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Edit exhibition</h1>
        <Link href={`/exhibitions/${exhibition.slug}`} className="text-sm text-muted hover:text-accent">
          View
        </Link>
      </div>
      {error === "invalid" ? (
        <p className="text-sm text-red-600">Title, venue and start date are required.</p>
      ) : null}
      <ExhibitionForm exhibition={exhibition} action={updateExhibition} />
    </main>
  );
}
