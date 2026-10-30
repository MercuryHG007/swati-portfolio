import Link from "next/link";
import { notFound } from "next/navigation";
import { getArtworkById } from "@/lib/admin-queries";
import { ArtworkForm } from "../artwork-form";
import { updateArtwork } from "../actions";
import { ToastOnLoad } from "@/components/admin/toast-on-load";

export default async function EditArtworkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const artwork = await getArtworkById(id);
  if (!artwork) notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <ToastOnLoad configs={[{ param: "error", type: "error", message: "Title and medium are required." }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Edit artwork</h1>
        <Link href={`/artwork/${artwork.slug}`} className="text-sm text-muted hover:text-accent">
          View
        </Link>
      </div>
      <ArtworkForm artwork={artwork} action={updateArtwork} />
    </main>
  );
}
