import { CookieSettingsButton } from "@/components/analytics/cookie-consent";
import { BrandLink } from "@/components/brand-link";
import { FooterNav } from "@/components/footer-nav";
import { MediaImage } from "@/components/media-image";
import { TextLink } from "@/components/text-link/text-link";
import { getAbout } from "@/lib/queries";

// The logo is square: 84px on mobile, 96px from md up. next/image's srcset supplies the 2x file for high-density screens.
const LOGO_SIZE = 96;

const FOOTER_NAV_LINKS = [
  { href: "/portfolio", label: "Portfolio" },
  { href: "/series", label: "Series" },
  { href: "/exhibitions", label: "Exhibitions" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export async function SiteFooter() {
  // The footer is in the root layout, so a data failure must not take every page down with it.
  const about = await getAbout().catch((err) => {
    console.error("Footer data unavailable:", err);
    return null;
  });
  const email = about?.contactEmail;
  const instagram = about?.socials?.instagram;
  const logo = about?.footerLogo;

  return (
    <footer className="site-footer border-t border-border">
      {/* Top row. Desktop: logo on the left, contacts and Explore on the right. Mobile: contacts and Explore stack above the logo. */}
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-6 pt-12 pb-8 text-sm text-foreground md:grid-cols-2 md:items-start md:gap-x-10">
        <div className="flex flex-col gap-8 md:col-start-2 md:row-start-1 md:flex-row md:items-start md:justify-self-end md:gap-x-10">
          <FooterNav links={FOOTER_NAV_LINKS} />
          <section aria-labelledby="footer-contact-heading" className="flex flex-col gap-2">
            <h2 id="footer-contact-heading" className="text-sm font-medium text-muted">
              Get in touch
            </h2>
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
          </section>
        </div>
        {logo ? (
          <BrandLink href="/" aria-label="Swati Garg home" className="w-fit md:col-start-1 md:row-start-1 md:justify-self-start">
            <MediaImage
              src={logo.publicId}
              alt={logo.alt || "Swati Garg"}
              width={LOGO_SIZE}
              height={LOGO_SIZE}
              className="h-[84px] w-[84px] md:h-[96px] md:w-[96px]"
            />
          </BrandLink>
        ) : null}
      </div>
      {/* Legal row: copyright, FAQ, Privacy, Copyright and cookie settings, bottom left, clear of the fixed back-to-top button. */}
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 border-t border-border px-6 py-3 text-xs text-muted">
        <p>© {new Date().getFullYear()} Swati Garg. All rights reserved.</p>
        <span aria-hidden="true">·</span>
        <TextLink href="/faq" variant="inverse" className="text-xs text-muted">FAQ</TextLink>
        <span aria-hidden="true">·</span>
        <TextLink href="/privacy" variant="inverse" className="text-xs text-muted">Privacy</TextLink>
        <span aria-hidden="true">·</span>
        <TextLink href="/copyright" variant="inverse" className="text-xs text-muted">Copyright</TextLink>
        <span aria-hidden="true">·</span>
        <CookieSettingsButton variant="link" />
      </div>
    </footer>
  );
}
