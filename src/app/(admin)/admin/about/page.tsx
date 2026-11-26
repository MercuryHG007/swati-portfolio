import { getOrCreateAbout } from "@/lib/admin-queries";
import { taglineOf } from "@/lib/site-copy";
import { updateAbout } from "./actions";
import { ImageUploader } from "@/components/admin/image-uploader";
import { CvRowsField, type CvRow } from "@/components/admin/cv-rows-field";
import { Field, FieldHint, inputClass, buttonClass } from "@/components/admin/ui";
import { ToastOnLoad } from "@/components/admin/toast-on-load";
import { ABOUT_TAGLINE_DEFAULT } from "@/models/About";

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
        <Field
          label="Tagline (shown under your name, and in the page title)"
          hint={`Shown under your name on the About page, and in the browser tab title and search description. Leave blank to use “${ABOUT_TAGLINE_DEFAULT}”.`}
        >
          <input name="tagline" defaultValue={taglineOf(about)} className={inputClass} />
        </Field>
        <Field
          label="Bio"
          hint="Your biography on the About page. Also included in the structured data that search engines read, and in the Markdown copy of the About page."
        >
          <textarea name="bio" defaultValue={about.bio} rows={8} className={inputClass} />
        </Field>
        <Field
          label="Artist statement"
          hint="Quote on the About page. Also included in llms.txt, the file AI tools read about you, and used as one input for the AI style guide."
        >
          <textarea name="statement" defaultValue={about.statement} rows={4} className={inputClass} />
        </Field>
        <Field
          label="Location (shown as “Lives and works in …”)"
          hint="Shown as “Lives and works in …” on the About page, and as “Based in …” in the search description. Also used when generating starter FAQ answers."
        >
          <input name="location" defaultValue={about.location} className={inputClass} />
        </Field>
        <Field
          key="photo"
          label="Photo"
          hint="Portrait in a circle at the top of the About page. Also used in the structured data that search engines read."
        >
          <ImageUploader
            name="photo"
            folder="swati-portfolio/about"
            initial={about.photo ? [about.photo] : []}
          />
        </Field>

        <Field
          key="footerLogo"
          label="Footer logo"
          hint="Square mark shown in the site footer (84 px on mobile, 96 px on larger screens) and used as the browser tab icon. Use at least 768 px. Leave empty to hide it from the footer."
        >
          <ImageUploader
            name="footerLogo"
            folder="swati-portfolio/about/logo"
            initial={about.footerLogo ? [about.footerLogo] : []}
          />
        </Field>

        {/* Stateful fields are keyed by name so React never hands one field's state to another when
            the form's layout changes while the page is open. */}
        <fieldset key="education" className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-medium text-foreground">Education</legend>
          <FieldHint>
            Listed under Education on the About page. Each row shows the date, then the title and detail. Also used when generating starter FAQ answers.
          </FieldHint>
          <CvRowsField name="education" initial={toRows(about.education)} addLabel="Add education" />
        </fieldset>

        <fieldset key="awards" className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-medium text-foreground">Awards</legend>
          <FieldHint>Listed under Awards on the About page, laid out like Education.</FieldHint>
          <CvRowsField name="awards" initial={toRows(about.awards)} addLabel="Add award" />
        </fieldset>

        <fieldset key="achievements" className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-medium text-foreground">Achievements</legend>
          <FieldHint>Listed under Achievements on the About page, laid out like Education.</FieldHint>
          <CvRowsField name="achievements" initial={toRows(about.achievements)} addLabel="Add achievement" />
        </fieldset>

        <Field
          label="Public collections (one per line)"
          hint="Each line is listed under Public collections on the About page, and in the Markdown copy of the About page."
        >
          <textarea
            name="publicCollections"
            defaultValue={(about.publicCollections ?? []).join("\n")}
            rows={3}
            className={inputClass}
          />
        </Field>

        <Field
          label="CV download URL (PDF)"
          hint="Link behind the “Download CV (PDF)” button on the About page. Leave empty to hide the button."
        >
          <input name="resumeUrl" defaultValue={about.resumeUrl} className={inputClass} />
        </Field>
        <Field
          label="Contact email"
          hint="Shown in the site footer under Get in touch, as a mailto link. Also used when generating starter FAQ answers."
        >
          <input name="contactEmail" type="email" defaultValue={about.contactEmail} className={inputClass} />
        </Field>
        <Field
          label="Instagram profile URL"
          hint="Linked as “Instagram” in the site footer. Also listed in the structured data that search engines read."
        >
          <input
            name="instagram"
            defaultValue={about.socials?.instagram}
            placeholder="https://www.instagram.com/…"
            className={inputClass}
          />
        </Field>
        <Field
          label="Facebook profile URL"
          hint="Not shown on the page. Listed in the structured data that search engines read, to link this profile to your name."
        >
          <input
            name="facebook"
            defaultValue={about.socials?.facebook}
            placeholder="https://www.facebook.com/…"
            className={inputClass}
          />
        </Field>
        <Field
          label="LinkedIn profile URL"
          hint="Not shown on the page. Listed in the structured data that search engines read, to link this profile to your name."
        >
          <input
            name="linkedin"
            defaultValue={about.socials?.linkedin}
            placeholder="https://www.linkedin.com/in/…"
            className={inputClass}
          />
        </Field>
        <Field
          label="YouTube channel URL"
          hint="Not shown on the page. Listed in the structured data that search engines read, to link this profile to your name."
        >
          <input
            name="youtube"
            defaultValue={about.socials?.youtube}
            placeholder="https://www.youtube.com/…"
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
