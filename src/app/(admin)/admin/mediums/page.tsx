import { Save, Trash2 } from "lucide-react";
import { getAllMediums } from "@/lib/admin-queries";
import { createMedium, updateMedium, deleteMedium } from "./actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { ActionIcon, inputClass, buttonClass, cardClass } from "@/components/admin/ui";
import { ToastOnLoad } from "@/components/admin/toast-on-load";

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "Name is required.",
  in_use: "Can't delete a medium that's still used by artworks.",
};

export default async function AdminMediumsPage() {
  const mediums = await getAllMediums();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <ToastOnLoad configs={[{ param: "error", type: "error", message: ERROR_MESSAGES }]} />
      <h1 className="text-2xl font-semibold text-foreground">Mediums</h1>

      <div className="flex flex-col gap-3">
        {mediums.map((medium) => (
          <form
            key={String(medium._id)}
            action={updateMedium}
            className={`${cardClass} flex flex-wrap items-center gap-3`}
          >
            <input type="hidden" name="id" value={String(medium._id)} />
            <input name="name" defaultValue={medium.name} className={`${inputClass} min-w-0 flex-1`} />
            <button type="submit" aria-label={`Save ${medium.name}`}>
              <ActionIcon icon={Save} variant="primary" />
            </button>
            <ConfirmButton
              confirmText={`Delete medium "${medium.name}"?`}
              formAction={deleteMedium}
              aria-label={`Delete ${medium.name}`}
            >
              <ActionIcon icon={Trash2} variant="danger" />
            </ConfirmButton>
          </form>
        ))}
      </div>

      <form action={createMedium} className={`${cardClass} flex flex-wrap items-center gap-3`}>
        <input name="name" placeholder="New medium name" required className={`${inputClass} min-w-0 flex-1`} />
        <button type="submit" className={buttonClass}>
          Add
        </button>
      </form>
    </main>
  );
}
