import Link from "next/link";
import { auth, signOut } from "@/auth";
import { MobileNavDrawer } from "@/components/mobile-nav-drawer";

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

  const signOutAction = async () => {
    "use server";
    await signOut({ redirectTo: "/admin/login" });
  };

  return (
    <header className="h-(--header-height) border-b border-border">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-4 px-6">
        <Link href="/admin" className="font-mono text-sm tracking-wide text-accent">
          Admin
        </Link>
        <nav className="hidden flex-wrap gap-5 text-sm text-foreground md:flex">
          {ADMIN_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-accent">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-4 text-sm text-muted md:flex">
          <span>{session.user.email}</span>
          <form action={signOutAction}>
            <button type="submit" className="hover:text-accent">
              Sign out
            </button>
          </form>
        </div>
        <MobileNavDrawer>
          {ADMIN_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-lg text-foreground hover:text-accent">
              {link.label}
            </Link>
          ))}
          <div className="mt-auto flex flex-col gap-3 border-t border-border pt-6 text-sm text-muted">
            <span>{session.user.email}</span>
            <form action={signOutAction}>
              <button type="submit" className="text-foreground hover:text-accent">
                Sign out
              </button>
            </form>
          </div>
        </MobileNavDrawer>
      </div>
    </header>
  );
}
