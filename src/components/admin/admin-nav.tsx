import Link from "next/link";
import { auth, signOut } from "@/auth";
import { CldImage } from "@/components/cloudinary-image";
import { MobileNavDrawer } from "@/components/mobile-nav-drawer";
import { TextLink, textLinkClasses } from "@/components/text-link/text-link";
import { getAbout } from "@/lib/queries";

// The logo is square and shown at 40px. Rendered at 2x so it stays sharp on high-density screens.
const LOGO_SIZE = 40;

const ADMIN_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/series", label: "Series" },
  { href: "/admin/artworks", label: "Artworks" },
  { href: "/admin/mediums", label: "Mediums" },
  { href: "/admin/subjects", label: "Subjects" },
  { href: "/admin/exhibitions", label: "Exhibitions" },
  { href: "/admin/about", label: "About" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/ai-assistant", label: "AI assistant" },
];

export async function AdminNav() {
  const session = await auth();
  if (!session?.user) return null;

  const about = await getAbout();
  const logo = about?.footerLogo;

  const signOutAction = async () => {
    "use server";
    await signOut({ redirectTo: "/admin/login" });
  };

  return (
    <header className="sticky top-0 z-40 h-(--header-height) border-b border-border bg-background">
      <div className="mx-auto grid h-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-6">
        <Link href="/admin" aria-label="Admin dashboard" className="shrink-0 justify-self-start">
          {logo ? (
            <CldImage
              src={logo.publicId}
              alt={logo.alt || "Swati Garg"}
              width={LOGO_SIZE * 2}
              height={LOGO_SIZE * 2}
              format="auto"
              quality="auto"
              className="h-10 w-10"
            />
          ) : (
            <span className="text-sm font-medium tracking-tight text-foreground">Admin</span>
          )}
        </Link>
        <nav className="hidden justify-self-center gap-5 text-sm text-foreground lg:flex">
          {ADMIN_LINKS.map((link) => (
            <TextLink key={link.href} href={link.href} variant="inverse" prefetch={false}>
              {link.label}
            </TextLink>
          ))}
        </nav>
        <div className="flex items-center justify-self-end gap-4">
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
      </div>
    </header>
  );
}
