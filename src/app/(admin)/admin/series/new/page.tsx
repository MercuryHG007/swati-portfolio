import { SeriesForm } from "../series-form";
import { createSeries } from "../actions";
import { ToastOnLoad } from "@/components/admin/toast-on-load";

export default function NewSeriesPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <ToastOnLoad
        configs={[
          {
            param: "error",
            type: "error",
            message: {
              invalid: "Title is required.",
              "slug-taken": "Another series already has this title. Change the title slightly and save again.",
            },
          },
        ]}
      />
      <h1 className="text-2xl font-semibold text-foreground">New series</h1>
      <SeriesForm action={createSeries} />
    </main>
  );
}
