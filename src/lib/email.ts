import { Resend } from "resend";

// Sends the enquiry to the artist. Throws when it can't, so the contact form can tell whether the enquiry got through.
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
  if (!apiKey || !to) {
    // Local development runs without email. In production, a silent skip would drop the enquiry notification.
    if (process.env.NODE_ENV === "production") {
      throw new Error("Contact email is not configured: RESEND_API_KEY and CONTACT_TO_EMAIL are required.");
    }
    return;
  }

  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  const resend = new Resend(apiKey);
  // The Resend SDK returns API failures in `error` rather than throwing, so check it explicitly.
  const { error } = await resend.emails.send({
    from: `Swati Garg Portfolio <${from}>`,
    to,
    replyTo: email,
    subject: `New contact message from ${name}`,
    text: `From: ${name} <${email}>\n\n${message}`,
  });
  if (error) {
    throw new Error(`Resend rejected the contact email: ${error.name}: ${error.message}`);
  }
}
