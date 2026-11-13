import Link from "next/link";
import { auth, signOut } from "@/auth";
import { AdminNavLinks } from "@/components/admin/admin-nav-links";
import { UserMenu } from "@/components/admin/user-menu";
import { CldImage } from "@/components/cloudinary-image";
import { MobileNavDrawer } from "@/components/mobile-nav-drawer";
import { TextLink, textLinkClasses } from "@/components/text-link/text-link";
import { getAbout } from "@/lib/queries";

// The logo is square and shown at 40px. Rendered at 2x so it stays sharp on high-density screens.
const LOGO_SIZE = 40;

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
    <header className="sticky top-0 z-40 flex h-(--header-height) items-center justify-between gap-4 border-b border-border bg-background px-6">
      <Link href="/admin" aria-label="Admin dashboard" className="shrink-0">
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
      <div className="flex items-center">
        <div className="hidden lg:block">
          <UserMenu signOut={signOutAction} />
        </div>
        <MobileNavDrawer breakpoint="lg">
          <AdminNavLinks />
          <div className="mt-auto flex flex-col gap-3 border-t border-border pt-6 text-sm text-foreground">
            <TextLink href="/admin/account" variant="inverse" prefetch={false} className="w-fit">
              Account settings
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
