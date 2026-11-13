import { BrandLink } from "@/components/brand-link";
import { CldImage } from "@/components/cloudinary-image";
import { TextLink } from "@/components/text-link/text-link";
import { getAbout } from "@/lib/queries";

// The logo is square and shown at 72px. Rendered at 2x so it stays sharp on high-density screens.
const LOGO_SIZE = 72;

export async function SiteFooter() {
  const about = await getAbout();
  const email = about?.contactEmail;
  const instagram = about?.socials?.instagram;
  const logo = about?.footerLogo;

  return (
    <footer className="border-t border-border">
      {/* Top row: logo on the left, contacts on the right. Mobile: contacts first, then logo. */}
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-6 pt-12 pb-8 text-sm text-foreground md:grid-cols-2 md:items-start md:gap-x-10">
        <div className="order-1 flex flex-col gap-2 md:order-none md:col-start-2 md:row-start-1 md:justify-self-end">
          {email ? (
            <TextLink href={`mailto:${email}`} variant="primary" className="w-fit">
              {email}
            </TextLink>
          ) : null}
          {instagram ? (
            <TextLink href={instagram} variant="primary" className="w-fit">
              Instagram
            </TextLink>
          ) : null}
        </div>
        {logo ? (
          <BrandLink
            href="/"
            aria-label="Swati Garg home"
            className="order-2 w-fit md:order-none md:col-start-1 md:row-start-1 md:justify-self-start"
          >
            <CldImage
              src={logo.publicId}
              alt={logo.alt || "Swati Garg"}
              width={LOGO_SIZE * 2}
              height={LOGO_SIZE * 2}
              format="auto"
              quality="auto"
              className="h-[72px] w-[72px]"
            />
        </BrandLink>
        ) : null}
      </div>
      {/* Legal row: copyright and Privacy, bottom left, clear of the fixed back-to-top button. */}
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 border-t border-border px-6 py-3 text-xs text-muted">
        <p>© {new Date().getFullYear()} Swati Garg. All rights reserved.</p>
        <span aria-hidden="true">·</span>
        <TextLink href="/privacy" variant="inverse" className="text-xs text-muted">Privacy</TextLink>
      </div>
    </footer>
  );
}
