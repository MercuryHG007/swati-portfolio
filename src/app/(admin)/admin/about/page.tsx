import { getOrCreateAbout } from "@/lib/admin-queries";
import { updateAbout } from "./actions";
import { ImageUploader } from "@/components/admin/image-uploader";
import { CvRowsField, type CvRow } from "@/components/admin/cv-rows-field";
import { Field, inputClass, buttonClass } from "@/components/admin/ui";
import { ToastOnLoad } from "@/components/admin/toast-on-load";

type StoredCvEntry = { title?: string; detail?: string; date?: string };

function toRows(entries: StoredCvEntry[] | undefined): CvRow[] {
  return (entries ?? []).map((entry) => ({
    title: entry.title ?? "",
    detail: entry.detail ?? "",
    date: entry.date ?? "",
  }));
}

export default async function AdminAboutPage() {
  const about = await getOrCreateAbout();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <ToastOnLoad configs={[{ param: "saved", type: "success", message: "Saved." }]} />
      <h1 className="text-2xl font-semibold text-foreground">About page</h1>

      <form action={updateAbout} className="flex flex-col gap-6">
        <Field label="Bio">
          <textarea name="bio" defaultValue={about.bio} rows={8} className={inputClass} />
        </Field>
        <Field label="Artist statement">
          <textarea name="statement" defaultValue={about.statement} rows={4} className={inputClass} />
        </Field>
        <Field label="Location (shown as “Lives and works in …”)">
          <input name="location" defaultValue={about.location} className={inputClass} />
        </Field>
        <Field label="Photo">
          <ImageUploader
            name="photo"
            folder="swati-portfolio/about"
            initial={about.photo ? [about.photo] : []}
          />
        </Field>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-medium text-foreground">Education</legend>
          <CvRowsField name="education" initial={toRows(about.education)} addLabel="Add education" />
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-medium text-foreground">Awards</legend>
          <CvRowsField name="awards" initial={toRows(about.awards)} addLabel="Add award" />
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-medium text-foreground">Achievements</legend>
          <CvRowsField name="achievements" initial={toRows(about.achievements)} addLabel="Add achievement" />
        </fieldset>

        <Field label="Public collections (one per line)">
          <textarea
            name="publicCollections"
            defaultValue={(about.publicCollections ?? []).join("\n")}
            rows={3}
            className={inputClass}
          />
        </Field>

        <Field label="CV download URL (PDF)">
          <input name="resumeUrl" defaultValue={about.resumeUrl} className={inputClass} />
        </Field>
        <Field label="Contact email">
          <input name="contactEmail" type="email" defaultValue={about.contactEmail} className={inputClass} />
        </Field>
        <Field label="Instagram profile URL">
          <input
            name="instagram"
            defaultValue={about.socials?.instagram}
            placeholder="https://www.instagram.com/…"
            className={inputClass}
          />
        </Field>
        <button type="submit" className={`${buttonClass} w-fit`}>
          Save
        </button>
      </form>
    </main>
  );
}
