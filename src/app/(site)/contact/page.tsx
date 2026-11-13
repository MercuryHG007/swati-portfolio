import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Button } from "@/components/button/button";
import { TrackClickButton } from "@/components/analytics/track-click-button";
import { TrackOnMount } from "@/components/analytics/track-on-mount";
import { ContactAttributionField } from "@/components/analytics/contact-attribution-field";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { connectToDatabase } from "@/lib/mongodb";
import { ContactMessage } from "@/models";
import { sendContactNotification } from "@/lib/email";
import { allowSubmission } from "@/lib/submission-throttle";
import { TURNSTILE_SITE_KEY, verifyTurnstile } from "@/lib/turnstile";
import { getAbout, getArtworkBySlug } from "@/lib/queries";
import { parseArtworkSlug, parseAttribution } from "@/lib/lead-source";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 60;

export const metadata = pageMetadata({
  title: "Contact — Swati Garg",
  description: "Get in touch with Swati Garg about commissions, exhibitions or general enquiries.",
  path: "/contact",
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function submitMessage(formData: FormData) {
  "use server";

  // Honeypot: real users never fill this (hidden via CSS below); bots often do.
  if (formData.get("company")) {
    redirect("/contact?sent=1");
  }

  const name = String(formData.get("name") ?? "").trim().slice(0, 200);
  const email = String(formData.get("email") ?? "").trim().slice(0, 320);
  const message = String(formData.get("message") ?? "").trim().slice(0, 5000);

  // Error redirects reload the form, so the artwork context has to travel with them. The retry value is
  // unique per redirect, so the captcha widget is recreated and its used token is discarded.
  const artworkSlug = parseArtworkSlug(formData.get("artwork"));
  const errorUrl = (error: string) =>
    `/contact?error=${error}&retry=${Date.now()}${artworkSlug ? `&artwork=${artworkSlug}` : ""}`;

  // Checked before the rate limit, so bots that fail the captcha don't use up the IP quota.
  const forwardedFor = (await headers()).get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
  const captchaToken = String(formData.get("cf-turnstile-response") ?? "");
  if (!(await verifyTurnstile(captchaToken, ip))) {
    redirect(errorUrl("captcha"));
  }

  // Per-IP limit. The per-email throttle below is bypassed by using a different address.
  if (!(await allowSubmission(ip))) {
    redirect(errorUrl("rate_limited"));
  }

  if (!name || !email || !message || !EMAIL_RE.test(email)) {
    redirect(errorUrl("invalid"));
  }

  await connectToDatabase();

  // Basic throttle: block a second submission from the same email within 60s.
  const recent = await ContactMessage.findOne({
    email,
    createdAt: { $gte: new Date(Date.now() - 60_000) },
  });
  if (recent) {
    redirect(errorUrl("rate_limited"));
  }

  const attribution = parseAttribution(formData.get("attribution"));
  const source = artworkSlug || attribution ? { ...attribution, artworkSlug } : undefined;

  await ContactMessage.create({ name, email, message, ...(source && { source }) });
  await sendContactNotification({ name, email, message });

  redirect("/contact?sent=1");
}

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string; artwork?: string; retry?: string }>;
}) {
  const { sent, error, artwork, retry } = await searchParams;
  const artworkSlug = parseArtworkSlug(artwork);
  const [about, enquiredArtwork] = await Promise.all([
    getAbout(),
    artworkSlug ? getArtworkBySlug(artworkSlug) : null,
  ]);
  // Only published artworks resolve here, so an unpublished slug just leaves the message blank.
  const messagePrefill = enquiredArtwork
    ? `Hi Swati, I'd like to enquire about "${enquiredArtwork.title}". `
    : undefined;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-3xl font-medium text-foreground">Contact</h1>
      <p className="text-muted">
        For commissions, exhibitions or general enquiries, send a message below.
      </p>

      {about?.socials?.instagram ? (
        <TrackClickButton
          href={about.socials.instagram}
          event="contact_click"
          params={{ channel: "instagram", location: "contact_page" }}
          variant="inverse"
          size="md"
        >
          Send a DM on Instagram
        </TrackClickButton>
      ) : null}

      {sent ? (
        <>
          <TrackOnMount event="generate_lead" params={{ lead_source: "contact_form" }} />
          <p className="rounded-md border border-border bg-surface px-4 py-3 text-sm text-foreground">
            Thanks — your message has been sent.
          </p>
        </>
      ) : (
        <form action={submitMessage} className="flex flex-col gap-4">
          {error === "invalid" ? (
            <p className="text-sm text-red-600">Please fill in all fields with a valid email.</p>
          ) : null}
          {error === "captcha" ? (
            <p className="text-sm text-red-600">Please complete the security check and send again.</p>
          ) : null}
          {error === "rate_limited" ? (
            <p className="text-sm text-red-600">
              You already sent a message recently — please wait a moment and try again.
            </p>
          ) : null}

          {/* Honeypot field — hidden from real users, left blank by them */}
          <input
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden="true"
          />
          <input type="hidden" name="artwork" value={artworkSlug} readOnly />
          <ContactAttributionField />

          <label className="flex flex-col gap-1 text-sm text-foreground">
            Name
            <input
              name="name"
              type="text"
              required
              maxLength={200}
              className="rounded-md border border-border bg-surface px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-foreground">
            Email
            <input
              name="email"
              type="email"
              required
              maxLength={320}
              className="rounded-md border border-border bg-surface px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-foreground">
            Message
            <textarea
              name="message"
              required
              maxLength={5000}
              rows={5}
              defaultValue={messagePrefill}
              className="rounded-md border border-border bg-surface px-3 py-2"
            />
          </label>
          {TURNSTILE_SITE_KEY ? (
            <TurnstileWidget key={retry ?? "initial"} siteKey={TURNSTILE_SITE_KEY} />
          ) : null}
          <Button type="submit" size="md">
            Send message
          </Button>
        </form>
      )}
    </main>
  );
}
