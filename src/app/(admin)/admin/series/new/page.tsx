import { SeriesForm } from "../series-form";
import { createSeries } from "../actions";

export default async function NewSeriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <h1 className="text-2xl font-semibold text-foreground">New series</h1>
      {error === "invalid" ? <p className="text-sm text-red-600">Title is required.</p> : null}
      <SeriesForm action={createSeries} />
    </main>
  );
}
