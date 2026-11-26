import { getHomeSettings } from "@/lib/queries";
import { updateHomeSettings } from "./actions";
import { Field, inputClass, buttonClass } from "@/components/admin/ui";
import { ToastOnLoad } from "@/components/admin/toast-on-load";

export default async function AdminHomePage() {
  const settings = await getHomeSettings();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <ToastOnLoad configs={[{ param: "saved", type: "success", message: "Saved." }]} />
      <h1 className="text-2xl font-semibold text-foreground">Home page</h1>

      <form action={updateHomeSettings} className="flex flex-col gap-6">
        <Field
          label="Hero heading"
          hint="The large heading at the top of the home page. It is also the opening line of the Markdown copy of the home page."
        >
          <textarea name="heroHeading" defaultValue={settings.heroHeading} rows={2} required className={inputClass} />
        </Field>
        <Field label="Hero button text" hint="Text on the button under the hero heading. It opens the Portfolio page.">
          <input name="heroButtonLabel" defaultValue={settings.heroButtonLabel} required className={inputClass} />
        </Field>
        <Field
          label="Featured work label"
          hint="Small heading above the home page carousel. The carousel shows up to 8 published artworks marked Featured."
        >
          <input name="featuredLabel" defaultValue={settings.featuredLabel} required className={inputClass} />
        </Field>
        <Field
          label="Mediums label"
          hint="Small heading above the medium buttons. Each button is a medium with work in the portfolio and opens the Portfolio filtered to it."
        >
          <input name="mediumsLabel" defaultValue={settings.mediumsLabel} required className={inputClass} />
        </Field>
        <Field
          label="Commissions heading"
          hint="Large text in the closing section of the home page, above the Get in touch button that opens Contact."
        >
          <textarea name="commissionsHeading" defaultValue={settings.commissionsHeading} rows={2} required className={inputClass} />
        </Field>
        <button type="submit" className={`${buttonClass} w-fit`}>
          Save
        </button>
      </form>
    </main>
  );
}
