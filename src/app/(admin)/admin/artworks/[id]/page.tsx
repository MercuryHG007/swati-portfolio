import Link from "next/link";
import { notFound } from "next/navigation";
import { getArtworkById } from "@/lib/admin-queries";
import { ArtworkForm } from "../artwork-form";
import { updateArtwork } from "../actions";

export default async function EditArtworkPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const artwork = await getArtworkById(id);
  if (!artwork) notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Edit artwork</h1>
        <Link href={`/artwork/${artwork.slug}`} className="text-sm text-muted hover:text-accent">
          View
        </Link>
      </div>
      {error === "invalid" ? (
        <p className="text-sm text-red-600">Title and medium are required.</p>
      ) : null}
      <ArtworkForm artwork={artwork} action={updateArtwork} />
    </main>
  );
}
