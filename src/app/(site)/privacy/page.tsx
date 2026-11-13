import type { Metadata } from "next";
import { TextLink } from "@/components/text-link/text-link";
import { CookieSettingsButton } from "@/components/analytics/cookie-consent";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Privacy — Swati Garg",
  description: "How this site uses analytics, the contact form and browser storage.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16 text-foreground">
      <h1 className="text-3xl font-medium">Privacy</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-medium">Analytics</h2>
        <p className="text-muted">
          With your permission, this site uses Google Analytics 4 to count visits and see which artworks and
          pages lead to enquiries. Google Signals and ad personalisation are switched off. If you decline,
          analytics does not run and GA4 sets no cookies. Known automated browsers are excluded. Vercel Speed
          Insights records anonymous page performance measurements that are not linked to individual visitors.
        </p>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-medium">Contact form</h2>
        <p className="text-muted">
          When you send a message, the name, email address and message you enter are stored so the artist can
          reply. If you send it from an artwork page, the artwork is recorded with it. If you accepted analytics,
          the page you came from and any campaign tags in the link are stored with it too. Messages are kept
          until they are deleted by the artist. Your email address is used only to reply to you. Cloudflare
          Turnstile checks the browser for bots before a message is sent. It does not read your message.
        </p>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-medium">Cookies and browser storage</h2>
        <p className="text-muted">
          Google Analytics sets cookies such as <code>_ga</code> only if you accept. The campaign and referral
          details are kept in your browser&apos;s local storage for 30 days, also only if you accept. Cloudflare
          Turnstile may set a cookie during its check. Your choice is saved in local storage so the banner does
          not return on every visit. You can change it at any time.
        </p>
        <div>
          <CookieSettingsButton />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-medium">Questions</h2>
        <p className="text-muted">
          To ask about your data or to have a message deleted, use the{" "}
          <TextLink href="/contact" variant="primary" className="text-accent">
            contact page
          </TextLink>
          .
        </p>
      </section>
    </main>
  );
}
