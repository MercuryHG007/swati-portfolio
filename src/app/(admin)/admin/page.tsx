import Link from "next/link";
import { getCounts } from "@/lib/admin-queries";
import { cardClass } from "@/components/admin/ui";

const SECTIONS = [
  { href: "/admin/series", label: "Series", countKey: "series" as const },
  { href: "/admin/artworks", label: "Artworks", countKey: "artworks" as const },
  { href: "/admin/mediums", label: "Mediums", countKey: "mediums" as const },
  { href: "/admin/subjects", label: "Subjects", countKey: "subjects" as const },
  { href: "/admin/exhibitions", label: "Exhibitions", countKey: "exhibitions" as const },
  { href: "/admin/messages", label: "Messages", countKey: "unreadMessages" as const, suffix: "unread" },
];

export default async function AdminDashboardPage() {
  const counts = await getCounts();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-16">
      <h1 className="text-2xl font-semibold text-foreground">Admin dashboard</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {SECTIONS.map((section) => (
          <Link key={section.href} href={section.href} className={`${cardClass} hover:border-accent`}>
            <p className="text-2xl font-semibold text-foreground">{counts[section.countKey]}</p>
            <p className="text-sm text-muted">
              {section.label}
              {section.suffix ? ` ${section.suffix}` : ""}
            </p>
          </Link>
        ))}
        <Link href="/admin/about" className={`${cardClass} hover:border-accent`}>
          <p className="text-sm text-foreground">Edit About page</p>
        </Link>
      </div>
    </main>
  );
}
