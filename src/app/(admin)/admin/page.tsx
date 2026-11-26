import Link from "next/link";
import { getCounts, getOrCreateAbout } from "@/lib/admin-queries";
import { missingAboutFields } from "@/lib/about-completeness";
import { cardClass } from "@/components/admin/ui";

const OVERVIEW = [
  { href: "/admin/series", label: "Series", countKey: "series" as const },
  { href: "/admin/artworks", label: "Artworks", countKey: "artworks" as const },
  { href: "/admin/exhibitions", label: "Exhibitions", countKey: "exhibitions" as const },
];

const sectionHeading = "text-xs uppercase tracking-widest font-sans text-muted";

type Counts = Awaited<ReturnType<typeof getCounts>>;

// Only items that need action appear; each links to the list where it can be fixed.
function attentionItems(counts: Counts) {
  return [
    { href: "/admin/messages", count: counts.unreadMessages, singular: "unread message", plural: "unread messages" },
    { href: "/admin/artworks?status=hidden", count: counts.hiddenArtworks, singular: "hidden artwork", plural: "hidden artworks" },
    { href: "/admin/exhibitions?status=hidden", count: counts.hiddenExhibitions, singular: "hidden exhibition", plural: "hidden exhibitions" },
    { href: "/admin/faq", count: counts.hiddenFaqs, singular: "hidden FAQ question", plural: "hidden FAQ questions" },
  ].filter((item) => item.count > 0);
}

export default async function AdminDashboardPage() {
  const [counts, about] = await Promise.all([getCounts(), getOrCreateAbout()]);
  const attention = attentionItems(counts);
  const missing = missingAboutFields(about);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-16">
      <h1 className="text-2xl font-semibold text-foreground">Admin dashboard</h1>

      <section className="flex flex-col gap-4">
        <h2 className={sectionHeading}>Needs attention</h2>
        {attention.length === 0 ? (
          <p className="text-muted">Nothing needs attention.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {attention.map((item) => (
              <Link key={item.href} href={item.href} className={`${cardClass} hover:border-accent`}>
                <p className="text-2xl font-semibold text-foreground">{item.count}</p>
                <p className="text-sm text-muted">{item.count === 1 ? item.singular : item.plural}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className={sectionHeading}>Overview</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {OVERVIEW.map((section) => (
            <Link key={section.href} href={section.href} className={`${cardClass} hover:border-accent`}>
              <p className="text-2xl font-semibold text-foreground">{counts[section.countKey]}</p>
              <p className="text-sm text-muted">{section.label}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className={sectionHeading}>About page</h2>
        <div className={`${cardClass} flex flex-col gap-3`}>
          <p className="text-sm text-foreground">
            {missing.length === 0
              ? "Every About field is filled in."
              : `Still empty: ${missing.join(", ")}.`}
          </p>
          <Link href="/admin/about" className="w-fit text-sm text-foreground underline">
            Edit About page
          </Link>
        </div>
      </section>
    </main>
  );
}
