import { Save, Trash2 } from "lucide-react";
import { getAllSubjects } from "@/lib/admin-queries";
import { createSubject, updateSubject, deleteSubject } from "./actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { ActionIcon, inputClass, cardClass } from "@/components/admin/ui";
import { NewNameDialog } from "@/components/admin/new-name-dialog";
import { ToastOnLoad } from "@/components/admin/toast-on-load";

export default async function AdminSubjectsPage() {
  const subjects = await getAllSubjects();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <ToastOnLoad
        configs={[
          { param: "saved", type: "success", message: "Saved." },
          { param: "deleted", type: "success", message: "Deleted." },
          { param: "error", type: "error", message: "Name is required." },
        ]}
      />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Subjects</h1>
        <NewNameDialog
          triggerLabel="New subject"
          title="New subject"
          placeholder="Subject name"
          action={createSubject}
        />
      </div>

      <div className="flex flex-col gap-3">
        {subjects.map((subject) => (
          <form
            key={String(subject._id)}
            action={updateSubject}
            className={`${cardClass} flex flex-wrap items-center gap-3`}
          >
            <input type="hidden" name="id" value={String(subject._id)} />
            <input name="name" defaultValue={subject.name} className={`${inputClass} min-w-0 flex-1`} />
            <button type="submit" aria-label={`Save ${subject.name}`} className="cursor-pointer">
              <ActionIcon icon={Save} variant="primary" />
            </button>
            <ConfirmButton
              confirmText={`Delete subject "${subject.name}"?`}
              formAction={deleteSubject}
              aria-label={`Delete ${subject.name}`}
            >
              <ActionIcon icon={Trash2} variant="danger" />
            </ConfirmButton>
          </form>
        ))}
      </div>
    </main>
  );
}
