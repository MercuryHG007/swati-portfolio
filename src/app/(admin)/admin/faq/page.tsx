import { Trash2 } from "lucide-react";
import { getAllFaqs } from "@/lib/admin-queries";
import { createFaq, updateFaq, deleteFaq, seedStarterFaqs } from "./actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { ActionIcon, Select, buttonClass, cardClass, inputClass } from "@/components/admin/ui";
import { ToastOnLoad } from "@/components/admin/toast-on-load";

export default async function AdminFaqPage() {
  const faqs = await getAllFaqs();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <ToastOnLoad
        configs={[
          { param: "saved", type: "success", message: "Saved." },
          { param: "deleted", type: "success", message: "Deleted." },
          { param: "error", type: "error", message: "Question and answer are required." },
        ]}
      />
      <h1 className="text-2xl font-semibold text-foreground">FAQ</h1>
      <p className="text-sm text-muted">
        Published questions appear on the public FAQ page, in the order shown here. Lower order numbers come first.
      </p>

      <form action={createFaq} className={`${cardClass} flex flex-col gap-3`}>
        <p className="text-sm font-medium text-foreground">New question</p>
        <FaqFields />
        <button type="submit" className={`${buttonClass} w-fit cursor-pointer`}>
          Add question
        </button>
      </form>

      <div className="flex flex-col gap-4">
        {faqs.length === 0 ? (
          <form action={seedStarterFaqs} className={`${cardClass} flex flex-col gap-3`}>
            <p className="text-sm text-muted">
              No questions yet. Add the starter questions, built from your About details, then edit them as needed.
            </p>
            <button type="submit" className={`${buttonClass} w-fit cursor-pointer`}>
              Add starter questions
            </button>
          </form>
        ) : null}
        {faqs.map((faq) => (
          <form key={String(faq._id)} action={updateFaq} className={`${cardClass} flex flex-col gap-3`}>
            <input type="hidden" name="id" value={String(faq._id)} />
            <FaqFields question={faq.question} answer={faq.answer} order={faq.order} status={faq.status} />
            <div className="flex items-center justify-between gap-3">
              <button type="submit" className={`${buttonClass} cursor-pointer`}>
                Save
              </button>
              <ConfirmButton
                confirmText={`Delete question "${faq.question}"?`}
                formAction={deleteFaq}
                aria-label={`Delete ${faq.question}`}
              >
                <ActionIcon icon={Trash2} variant="danger" />
              </ConfirmButton>
            </div>
          </form>
        ))}
      </div>
    </main>
  );
}

function FaqFields({
  question = "",
  answer = "",
  order = 0,
  status = "published",
}: {
  question?: string;
  answer?: string;
  order?: number;
  status?: string;
}) {
  return (
    <>
      <input
        name="question"
        defaultValue={question}
        placeholder="Question"
        aria-label="Question"
        required
        className={inputClass}
      />
      <textarea
        name="answer"
        defaultValue={answer}
        placeholder="Answer"
        aria-label="Answer"
        rows={4}
        required
        className={inputClass}
      />
      <div className="grid grid-cols-2 gap-3">
        <input name="order" type="number" defaultValue={order} aria-label="Order" className={inputClass} />
        <Select name="status" defaultValue={status} aria-label="Status">
          <option value="published">Published</option>
          <option value="hidden">Hidden</option>
        </Select>
      </div>
    </>
  );
}
