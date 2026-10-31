import Link from "next/link";
import { auth, signOut } from "@/auth";
import { MobileNavDrawer } from "@/components/mobile-nav-drawer";
import { TextLink, textLinkClasses } from "@/components/text-link/text-link";

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
        <Link href="/admin" className="min-w-0 max-w-[14rem] truncate text-sm font-medium tracking-tight text-foreground">
          {session.user.email ?? "Admin"}
        </Link>
        <nav className="hidden gap-5 text-sm text-foreground lg:flex">
          {ADMIN_LINKS.map((link) => (
            <TextLink key={link.href} href={link.href} variant="inverse" prefetch={false}>
              {link.label}
            </TextLink>
          ))}
        </nav>
        <div className="hidden items-center gap-4 text-sm text-foreground lg:flex">
          <TextLink href="/admin/account" variant="inverse" prefetch={false}>
            Account
          </TextLink>
          <form action={signOutAction}>
            <button type="submit" className={`${textLinkClasses("inverse")} cursor-pointer`}>
              Sign out
            </button>
          </form>
        </div>
        <MobileNavDrawer breakpoint="lg">
          {ADMIN_LINKS.map((link) => (
            <TextLink key={link.href} href={link.href} variant="inverse" prefetch={false} className="text-lg text-foreground">
              {link.label}
            </TextLink>
          ))}
          <div className="mt-auto flex flex-col gap-3 border-t border-border pt-6 text-sm text-foreground">
            <TextLink href="/admin/account" variant="inverse" prefetch={false} className="w-fit">
              Account
            </TextLink>
            <form action={signOutAction}>
              <button type="submit" className={`${textLinkClasses("inverse")} w-fit cursor-pointer`}>
                Sign out
              </button>
            </form>
          </div>
        </MobileNavDrawer>
      </div>
    </header>
  );
}
