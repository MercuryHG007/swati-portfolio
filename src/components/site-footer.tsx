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
      {/* Desktop: logo on the left, privacy and contacts on the right, copyright under the logo. Mobile: stacked, copyright last. */}
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-6 py-12 text-sm text-foreground md:grid-cols-2 md:items-start md:gap-x-10 md:gap-y-4">
        <p className={`order-3 text-xs text-muted md:order-none md:col-start-1 ${logo ? "md:row-start-2" : "md:row-start-1"}`}>
          © {new Date().getFullYear()} Swati Garg. All rights reserved.
        </p>
        <div className="order-1 flex flex-col gap-2 md:order-none md:col-start-2 md:row-start-1 md:justify-self-end">
          <TextLink href="/privacy" variant="inverse" className="w-fit">Privacy</TextLink>
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
    </footer>
  );
}
