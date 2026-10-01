import { ArtworkForm } from "../artwork-form";
import { createArtwork } from "../actions";
import { ToastOnLoad } from "@/components/admin/toast-on-load";

export default function NewArtworkPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <ToastOnLoad configs={[{ param: "error", type: "error", message: "Title and medium are required." }]} />
      <h1 className="text-2xl font-semibold text-foreground">New artwork</h1>
      <ArtworkForm action={createArtwork} />
    </main>
  );
}
