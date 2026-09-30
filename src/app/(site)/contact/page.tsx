import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/mongodb";
import { ContactMessage } from "@/models";

export const revalidate = 60;

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

  if (!name || !email || !message || !EMAIL_RE.test(email)) {
    redirect("/contact?error=invalid");
  }

  await connectToDatabase();

  // Basic throttle: block a second submission from the same email within 60s.
  const recent = await ContactMessage.findOne({
    email,
    createdAt: { $gte: new Date(Date.now() - 60_000) },
  });
  if (recent) {
    redirect("/contact?error=rate_limited");
  }

  await ContactMessage.create({ name, email, message });

  redirect("/contact?sent=1");
}

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold text-foreground">Contact</h1>
      <p className="text-muted">
        For commissions, exhibitions or general enquiries, send a message below.
      </p>

      {sent ? (
        <p className="rounded-md border border-border bg-surface px-4 py-3 text-sm text-foreground">
          Thanks — your message has been sent.
        </p>
      ) : (
        <form action={submitMessage} className="flex flex-col gap-4">
          {error === "invalid" ? (
            <p className="text-sm text-red-600">Please fill in all fields with a valid email.</p>
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
              className="rounded-md border border-border bg-surface px-3 py-2"
            />
          </label>
          <button type="submit" className="rounded-md bg-accent px-4 py-2 text-accent-foreground">
            Send message
          </button>
        </form>
      )}
    </main>
  );
}
