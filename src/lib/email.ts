import { Resend } from "resend";

// Best-effort notification only — the message is already durably saved to
// Mongo (ContactMessage) before this runs, so a missing/invalid Resend
// config or a failed send must never break the contact form for the user.
export async function sendContactNotification({
  name,
  email,
  message,
}: {
  name: string;
  email: string;
  message: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !to) return;

  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: `Swati Garg Portfolio <${from}>`,
      to,
      replyTo: email,
      subject: `New contact message from ${name}`,
      text: `From: ${name} <${email}>\n\n${message}`,
    });
  } catch (err) {
    console.error("Failed to send contact notification email:", err);
  }
}
