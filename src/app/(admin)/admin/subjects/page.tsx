import { getAllSubjects } from "@/lib/admin-queries";
import { createSubject, updateSubject, deleteSubject } from "./actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { inputClass, buttonClass, dangerButtonClass, cardClass } from "@/components/admin/ui";

export default async function AdminSubjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const subjects = await getAllSubjects();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <h1 className="text-2xl font-semibold text-foreground">Subjects</h1>

      {error === "invalid" ? <p className="text-sm text-red-600">Name is required.</p> : null}

      <div className="flex flex-col gap-3">
        {subjects.map((subject) => (
          <form
            key={String(subject._id)}
            action={updateSubject}
            className={`${cardClass} flex items-center gap-3`}
          >
            <input type="hidden" name="id" value={String(subject._id)} />
            <input name="name" defaultValue={subject.name} className={`${inputClass} flex-1`} />
            <button type="submit" className={buttonClass}>
              Save
            </button>
            <ConfirmButton
              confirmText={`Delete subject "${subject.name}"?`}
              className={dangerButtonClass}
              formAction={deleteSubject}
            >
              Delete
            </ConfirmButton>
          </form>
        ))}
      </div>

      <form action={createSubject} className={`${cardClass} flex items-center gap-3`}>
        <input name="name" placeholder="New subject name" required className={`${inputClass} flex-1`} />
        <button type="submit" className={buttonClass}>
          Add
        </button>
      </form>
    </main>
  );
}
