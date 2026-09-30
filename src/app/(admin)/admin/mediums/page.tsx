import { getAllMediums } from "@/lib/admin-queries";
import { createMedium, updateMedium, deleteMedium } from "./actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { inputClass, buttonClass, dangerButtonClass, cardClass } from "@/components/admin/ui";

export default async function AdminMediumsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const mediums = await getAllMediums();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <h1 className="text-2xl font-semibold text-foreground">Mediums</h1>

      {error === "invalid" ? <p className="text-sm text-red-600">Name is required.</p> : null}
      {error === "in_use" ? (
        <p className="text-sm text-red-600">Can&apos;t delete a medium that&apos;s still used by artworks.</p>
      ) : null}

      <div className="flex flex-col gap-3">
        {mediums.map((medium) => (
          <form
            key={String(medium._id)}
            action={updateMedium}
            className={`${cardClass} flex items-center gap-3`}
          >
            <input type="hidden" name="id" value={String(medium._id)} />
            <input name="name" defaultValue={medium.name} className={`${inputClass} flex-1`} />
            <button type="submit" className={buttonClass}>
              Save
            </button>
            <ConfirmButton
              confirmText={`Delete medium "${medium.name}"?`}
              className={dangerButtonClass}
              formAction={deleteMedium}
            >
              Delete
            </ConfirmButton>
          </form>
        ))}
      </div>

      <form action={createMedium} className={`${cardClass} flex items-center gap-3`}>
        <input name="name" placeholder="New medium name" required className={`${inputClass} flex-1`} />
        <button type="submit" className={buttonClass}>
          Add
        </button>
      </form>
    </main>
  );
}
