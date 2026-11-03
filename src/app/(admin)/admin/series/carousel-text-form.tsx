import { updateSeriesSettings } from "./actions";
import { Field, inputClass, buttonClass } from "@/components/admin/ui";

export function CarouselTextForm({
  settings,
}: {
  settings: { heading: string; body: string; ctaLabel: string };
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-border pt-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-foreground">Portfolio carousel text</h2>
        <p className="text-sm text-muted">
          Shown above the featured series on the portfolio page. Mark a series as featured in its edit form.
        </p>
      </div>
      <form action={updateSeriesSettings} className="flex flex-col gap-4">
        <Field label="Heading">
          <input name="heading" defaultValue={settings.heading} required className={inputClass} />
        </Field>
        <Field label="Body">
          <textarea name="body" defaultValue={settings.body} rows={3} className={inputClass} />
        </Field>
        <Field label="Button text">
          <input name="ctaLabel" defaultValue={settings.ctaLabel} required className={inputClass} />
        </Field>
        <div>
          <button type="submit" className={buttonClass}>
            Save
          </button>
        </div>
      </form>
    </section>
  );
}
