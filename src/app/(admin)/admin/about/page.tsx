import { getOrCreateAbout } from "@/lib/admin-queries";
import { updateAbout } from "./actions";
import { ImageUploader } from "@/components/admin/image-uploader";
import { Field, inputClass, buttonClass } from "@/components/admin/ui";
import { ToastOnLoad } from "@/components/admin/toast-on-load";

export default async function AdminAboutPage() {
  const about = await getOrCreateAbout();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <ToastOnLoad configs={[{ param: "saved", type: "success", message: "Saved." }]} />
      <h1 className="text-2xl font-semibold text-foreground">About page</h1>

      <form action={updateAbout} className="flex flex-col gap-4">
        <Field label="Bio">
          <textarea name="bio" defaultValue={about.bio} rows={8} className={inputClass} />
        </Field>
        <Field label="Artist statement">
          <textarea name="statement" defaultValue={about.statement} rows={4} className={inputClass} />
        </Field>
        <Field label="Photo">
          <ImageUploader
            name="photo"
            folder="swati-portfolio/about"
            initial={about.photo ? [about.photo] : []}
          />
        </Field>
        <Field label="Resume URL">
          <input name="resumeUrl" defaultValue={about.resumeUrl} className={inputClass} />
        </Field>
        <Field label="Contact email">
          <input name="contactEmail" type="email" defaultValue={about.contactEmail} className={inputClass} />
        </Field>
        <Field label="Instagram">
          <input name="instagram" defaultValue={about.socials?.instagram} className={inputClass} />
        </Field>
        <button type="submit" className={buttonClass}>
          Save
        </button>
      </form>
    </main>
  );
}
