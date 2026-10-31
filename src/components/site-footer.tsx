import { TextLink } from "@/components/text-link/text-link";
import { getAbout } from "@/lib/queries";

export async function SiteFooter() {
  const about = await getAbout();
  const email = about?.contactEmail;
  const instagram = about?.socials?.instagram;

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12 text-sm text-foreground md:flex-row md:items-start md:justify-between">
        <p className="text-xs text-muted">
          © {new Date().getFullYear()} Swati Garg. All rights reserved.
        </p>
        <nav aria-label="Footer" className="flex flex-col gap-2">
          <TextLink href="/portfolio" variant="inverse" className="w-fit">Portfolio</TextLink>
          <TextLink href="/about" variant="inverse" className="w-fit">About</TextLink>
          <TextLink href="/contact" variant="inverse" className="w-fit">Get in touch</TextLink>
        </nav>
        <div className="flex flex-col gap-2">
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
      </div>
    </footer>
  );
}
