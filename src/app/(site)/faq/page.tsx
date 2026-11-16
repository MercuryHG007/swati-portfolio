import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { getPublishedFaqs } from "@/lib/queries";
import { faqJsonLd, pageMetadata } from "@/lib/seo";

export const revalidate = 60;

export const metadata = pageMetadata({
  title: "Frequently asked questions — Swati Garg",
  description: "Common questions about Swati Garg, her paintings, enquiries and exhibitions.",
  path: "/faq",
});

export default async function FaqPage() {
  const faqs = await getPublishedFaqs();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-16">
      {faqs.length > 0 ? <JsonLd data={faqJsonLd(faqs)} /> : null}
      <Breadcrumbs items={[{ label: "Frequently asked questions" }]} />
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-medium text-foreground">Frequently asked questions</h1>
      </header>

      {faqs.length > 0 ? (
        <div className="flex max-w-3xl flex-col divide-y divide-border border-y border-border">
          {faqs.map((item) => (
            <details key={item.question} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg text-foreground [&::-webkit-details-marker]:hidden">
                {item.question}
                <span aria-hidden="true" className="text-2xl leading-none text-muted transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-4 max-w-2xl whitespace-pre-line leading-relaxed text-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      ) : (
        <p className="text-muted">No questions yet.</p>
      )}
    </main>
  );
}
