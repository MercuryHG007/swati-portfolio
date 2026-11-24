import { ArtworkForm } from "../artwork-form";
import { createArtwork } from "../actions";
import { ToastOnLoad } from "@/components/admin/toast-on-load";

export default function NewArtworkPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <ToastOnLoad
        configs={[
          {
            param: "error",
            type: "error",
            message: {
              invalid: "Title and medium are required.",
              "slug-taken": "Another artwork already has this title. Change the title slightly and save again.",
            },
          },
        ]}
      />
      <h1 className="text-2xl font-semibold text-foreground">New artwork</h1>
      <ArtworkForm action={createArtwork} />
    </main>
  );
}
