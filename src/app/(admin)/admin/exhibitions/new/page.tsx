import { ExhibitionForm } from "../exhibition-form";
import { createExhibition } from "../actions";
import { ToastOnLoad } from "@/components/admin/toast-on-load";

export default function NewExhibitionPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <ToastOnLoad
        configs={[{ param: "error", type: "error", message: "Title, venue and start date are required." }]}
      />
      <h1 className="text-2xl font-semibold text-foreground">New exhibition</h1>
      <ExhibitionForm action={createExhibition} />
    </main>
  );
}
