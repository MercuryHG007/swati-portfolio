import Link from "next/link";
import { getAllExhibitions } from "@/lib/admin-queries";
import { formatDateRange } from "@/lib/format";
import { deleteExhibition } from "./actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { buttonClass, dangerButtonClass, secondaryButtonClass, cardClass } from "@/components/admin/ui";

export default async function AdminExhibitionsListPage() {
  const exhibitions = await getAllExhibitions();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Exhibitions</h1>
        <Link href="/admin/exhibitions/new" className={buttonClass}>
          New exhibition
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {exhibitions.map((exhibition) => (
          <div
            key={String(exhibition._id)}
            className={`${cardClass} flex items-center justify-between gap-3`}
          >
            <div>
              <p className="text-foreground">{exhibition.title}</p>
              <p className="text-xs text-muted">
                {exhibition.status} · {exhibition.venue} ·{" "}
                {formatDateRange(exhibition.startDate, exhibition.endDate)}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/exhibitions/${exhibition._id}`} className={secondaryButtonClass}>
                Edit
              </Link>
              <form action={deleteExhibition}>
                <input type="hidden" name="id" value={String(exhibition._id)} />
                <ConfirmButton
                  confirmText={`Delete exhibition "${exhibition.title}"?`}
                  className={dangerButtonClass}
                >
                  Delete
                </ConfirmButton>
              </form>
            </div>
          </div>
        ))}
        {exhibitions.length === 0 ? <p className="text-muted">No exhibitions yet.</p> : null}
      </div>
    </main>
  );
}
