import { DRAFT_MIN_DESCRIPTIONS, getStyleGuide } from "@/lib/artist-voice";
import { SUGGESTED_GEMINI_MODELS, SUGGESTED_GEMINI_ORDER, getGeminiModelStatus } from "@/lib/gemini-models";
import { CopyButton } from "@/components/copy-button";
import { ToastOnLoad } from "@/components/admin/toast-on-load";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Field, buttonClass, inputClass } from "@/components/admin/ui";
import { STYLE_GUIDE_MAX_LENGTH } from "@/models/ArtworkAssistSettings";
import { draftStyleGuideFromWork, updateGeminiModels, updateStyleGuide } from "./actions";

function formatIst(date: Date): string {
  return `${date.toLocaleString("en-US", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} IST`;
}

export default async function AdminAiAssistantPage() {
  const [styleGuide, modelStatus] = await Promise.all([getStyleGuide(), getGeminiModelStatus()]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <ToastOnLoad
        configs={[
          { param: "saved", type: "success", message: "Style guide saved." },
          { param: "modelsSaved", type: "success", message: "Model order saved. The next suggestion uses it." },
          { param: "drafted", type: "success", message: "Draft saved. Read it through and edit anything that doesn't sound like you." },
          {
            param: "error",
            type: "error",
            message: {
              "not-configured": "Set GEMINI_API_KEY before drafting a style guide.",
              "too-few": `Publish at least ${DRAFT_MIN_DESCRIPTIONS} artworks with descriptions before drafting.`,
              "draft-failed": "The draft could not be created. Try again later.",
              "invalid-models": "Enter up to 5 model IDs separated by commas, using letters, numbers, dots and dashes.",
            },
          },
        ]}
      />
      <h1 className="text-2xl font-semibold text-foreground">AI assistant</h1>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-medium text-foreground">Gemini models</h2>
          <p className="text-sm text-muted">
            Models are tried in this order. If one is over its daily limit, the next one is used. A model that hits
            its daily limit is skipped until it resets at midnight Pacific. Leave this empty to use the default.
          </p>
        </div>

        <form action={updateGeminiModels} className="flex flex-col gap-3">
          <Field label="Model order">
            <input
              name="geminiModels"
              defaultValue={modelStatus.saved.join(", ")}
              placeholder={modelStatus.order.join(", ")}
              className={inputClass}
            />
          </Field>
          <div>
            <button type="submit" className={buttonClass}>
              Save model order
            </button>
          </div>
        </form>

        <div className="flex flex-col gap-1 text-sm text-muted">
          <p>Currently trying: {modelStatus.order.join(" → ")}</p>
          {modelStatus.exhausted.map((entry) => (
            <p key={entry.model} className="text-red-500">
              <span className="font-medium">{entry.model}</span> is over its daily limit until <span className="font-medium">{formatIst(entry.until)}</span>.
            </p>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-foreground">Suggested models</p>
            <CopyButton text={SUGGESTED_GEMINI_ORDER} label="Copy recommended order" />
          </div>
          <ul className="flex flex-col gap-2">
            {SUGGESTED_GEMINI_MODELS.map((model) => (
              <li key={model.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                <div className="flex flex-col gap-0.5">
                  <code className="text-sm text-foreground">{model.id}</code>
                  <span className="text-xs text-muted">{model.note}</span>
                </div>
                <CopyButton text={model.id} label={`Copy ${model.id}`} />
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">
            The recommended order is {SUGGESTED_GEMINI_ORDER}. Copy it into the field above and save.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-medium text-foreground">Style guide</h2>
          <p className="text-sm text-muted">
            Sent with every artwork suggestion, so the AI writes in your voice. Write rules you would give a
            writer, such as tone, sentence length, words to use or avoid, and what to emphasise. Changes apply to
            the next suggestion. The AI never overrides its rules on describing only what is visible.
          </p>
        </div>

        <form action={updateStyleGuide} className="flex flex-col gap-3">
          <Field label="Your rules">
            <textarea
              name="styleGuide"
              defaultValue={styleGuide}
              rows={12}
              maxLength={STYLE_GUIDE_MAX_LENGTH}
              placeholder={"- Short sentences. Plain, warm tone.\n- Lead with the colour or light, then the subject.\n- Avoid 'stunning', 'breathtaking' and other superlatives."}
              className={inputClass}
            />
          </Field>
          <div>
            <button type="submit" className={buttonClass}>
              Save style guide
            </button>
          </div>
        </form>

        <form className="flex flex-col gap-2 border-t border-border pt-4">
          <p className="text-sm text-muted">
            Not sure where to start? Draft a style guide from your published descriptions and About statement.
            The draft replaces the saved guide, so read it through before you rely on it.
          </p>
          <div>
            <ConfirmButton
              formAction={draftStyleGuideFromWork}
              confirmText="Replace the saved style guide with an AI draft?"
              className={buttonClass}
            >
              Draft from my descriptions
            </ConfirmButton>
          </div>
        </form>
      </section>

      <p className="text-xs text-muted">
        The style guide, your artwork descriptions and your artwork images are sent to Google&apos;s Gemini API.
        On the free tier, Google may use that content to improve its products. Use a billed project for real work.
      </p>
    </main>
  );
}
