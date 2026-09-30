import Link from "next/link";
import { auth, signOut } from "@/auth";

const ADMIN_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/series", label: "Series" },
  { href: "/admin/artworks", label: "Artworks" },
  { href: "/admin/mediums", label: "Mediums" },
  { href: "/admin/subjects", label: "Subjects" },
  { href: "/admin/exhibitions", label: "Exhibitions" },
  { href: "/admin/about", label: "About" },
  { href: "/admin/messages", label: "Messages" },
];

export async function AdminNav() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <nav className="flex flex-wrap gap-5 text-sm text-foreground">
          {ADMIN_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-accent">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4 text-sm text-muted">
          <span>{session.user.email}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/admin/login" });
            }}
          >
            <button type="submit" className="hover:text-accent">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
