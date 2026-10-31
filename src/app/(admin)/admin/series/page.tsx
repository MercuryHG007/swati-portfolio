import { getAllSeries } from "@/lib/admin-queries";
import { getSeriesSettings } from "@/lib/queries";
import { ToastOnLoad } from "@/components/admin/toast-on-load";
import { SeriesList } from "./series-list";
import { CarouselTextForm } from "./carousel-text-form";

export default async function AdminSeriesListPage() {
  const [series, settings] = await Promise.all([getAllSeries(), getSeriesSettings()]);
  const items = series.map((item) => ({
    _id: String(item._id),
    title: item.title,
    status: item.status,
    featured: item.featured ?? false,
  }));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <ToastOnLoad configs={[{ param: "saved", type: "success", message: "Saved." }]} />
      <SeriesList initialSeries={items} />
      <CarouselTextForm settings={{ heading: settings.heading, body: settings.body, ctaLabel: settings.ctaLabel }} />
    </main>
  );
}

