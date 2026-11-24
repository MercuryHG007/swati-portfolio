import { getAllSubjectsWithArtworkCount } from "@/lib/admin-queries";
import { createSubject } from "./actions";
import { NewNameDialog } from "@/components/admin/new-name-dialog";
import { ToastOnLoad } from "@/components/admin/toast-on-load";
import { SubjectList, type SubjectRow } from "./subject-list";

export default async function AdminSubjectsPage() {
  const subjects = await getAllSubjectsWithArtworkCount();
  const rows: SubjectRow[] = subjects.map((subject) => ({
    id: String(subject._id),
    name: subject.name,
    artworkCount: subject.artworkCount,
    uploadedAt: new Date(subject.createdAt).getTime(),
  }));

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

      <SubjectList subjects={rows} />
    </main>
  );
}
