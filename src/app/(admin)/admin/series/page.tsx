import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { getAllSeries } from "@/lib/admin-queries";
import { deleteSeries } from "./actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { ActionIcon, buttonClass, cardClass } from "@/components/admin/ui";

export default async function AdminSeriesListPage() {
  const series = await getAllSeries();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Series</h1>
        <Link href="/admin/series/new" className={buttonClass}>
          New series
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {series.map((item) => (
          <div key={String(item._id)} className={`${cardClass} flex items-center justify-between gap-3`}>
            <div>
              <p className="text-foreground">{item.title}</p>
              <p className="text-xs text-muted">
                {item.status} · order {item.order}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/series/${item._id}`} aria-label={`Edit ${item.title}`}>
                <ActionIcon icon={Pencil} />
              </Link>
              <form action={deleteSeries}>
                <input type="hidden" name="id" value={String(item._id)} />
                <ConfirmButton
                  confirmText={`Delete series "${item.title}"? Its artworks will become standalone.`}
                  aria-label={`Delete ${item.title}`}
                >
                  <ActionIcon icon={Trash2} variant="danger" />
                </ConfirmButton>
              </form>
            </div>
          </div>
        ))}
        {series.length === 0 ? <p className="text-muted">No series yet.</p> : null}
      </div>
    </main>
  );
}
