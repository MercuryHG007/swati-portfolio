import { getAllSeries } from "@/lib/admin-queries";
import { SeriesList } from "./series-list";

export default async function AdminSeriesListPage() {
  const series = await getAllSeries();
  const items = series.map((item) => ({ _id: String(item._id), title: item.title, status: item.status }));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <SeriesList initialSeries={items} />
    </main>
  );
}

