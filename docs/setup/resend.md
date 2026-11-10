# Resend setup (contact form email)

When a visitor sends the contact form, the message is saved to MongoDB first, then Resend emails
you a copy (`src/lib/email.ts`). The reply-to address is set to the visitor, so you can reply
directly from your inbox.

Email is optional. Without these variables the form still works, and messages still appear at
`/admin/messages`. The notification is simply skipped.

## What the code expects

| Variable | Required? | Purpose | Public? |
| --- | --- | --- | --- |
| `RESEND_API_KEY` | Yes, for email | Authenticates with Resend | **No. Secret.** |
| `CONTACT_TO_EMAIL` | Yes, for email | Where notifications are sent | No |
| `RESEND_FROM_EMAIL` | Optional | Sender address. Defaults to `onboarding@resend.dev` | No |

Notes on the code's behaviour:

- Send failures are logged on the server (`Failed to send contact notification email`). The
  visitor still sees "Thanks — your message has been sent", so check the logs or the Resend
  dashboard if emails stop arriving.
- Each notification has subject `New contact message from <name>`, and its body begins with the
  sender's name and email address.

---

## Part 1: Create a Resend account and API key

1. Go to [resend.com](https://resend.com) and sign up or sign in.
2. Open **API Keys** in the left menu → **Create API key**.
3. Name: `swati-portfolio`. Permission: **Sending access**. Domain: **All domains** (or your
   verified domain, once Part 2 is done).
4. Click **Add**, then copy the key. It starts with `re_` and is shown once only.

This key is `RESEND_API_KEY`.

---

## Part 2: Choose a sender address

You have two choices.

### Option A: Testing (no domain yet)

Leave `RESEND_FROM_EMAIL` blank. The app sends from `onboarding@resend.dev`, which Resend provides
for testing. Check Resend's current documentation for who this sender can deliver to, and don't
rely on it for live traffic.

### Option B: Your own domain (recommended before going live)

1. In Resend, open **Domains** → **Add domain**.
2. Enter your domain, or a subdomain such as `mail.yourdomain.com`. Resend recommends sending from
   a subdomain so the sending reputation stays separate from your main domain.
3. Region: choose the one closest to your recipients (for example Mumbai).
4. Resend shows a list of DNS records (SPF, DKIM, and sometimes MX or DMARC). Add each one at the
   place where your domain's DNS is managed (your registrar, or a provider such as Cloudflare).
   - Copy the **Name** and **Value** exactly. Some registrars add the root domain automatically, so
     a name of `resend._domainkey.mail` may need to be entered without `.yourdomain.com`.
5. Back in Resend, click **Verify DNS records**. DNS changes can take from a few minutes to a few
   hours. The domain status changes to **Verified** when it's ready.
6. Set the sender in `.env.local`. Any address at the verified domain works:

   ```bash
   RESEND_FROM_EMAIL=hello@mail.yourdomain.com
   ```

Don't use an address at a domain you haven't verified. Resend will reject the send, and the email
will silently fail for visitors.

---

## Part 3: Set the variables

Add them to `.env.local`:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
CONTACT_TO_EMAIL=you@example.com
RESEND_FROM_EMAIL=hello@mail.yourdomain.com   # optional, see Part 2
```

`CONTACT_TO_EMAIL` is your personal inbox, where notifications should arrive.

Add the same variables in **Vercel → Project → Settings → Environment Variables**, then redeploy.

---

## Part 4: Verify

1. Start the app (`npm run dev`).
2. Open [http://localhost:3000/contact](http://localhost:3000/contact) and submit a test message
   with a valid email address. Use a different address from `CONTACT_TO_EMAIL` so you can see the
   reply-to behaviour.
3. You should see "Thanks — your message has been sent."
4. Check these, in order:
   - The message appears at `/admin/messages`. This confirms the database save worked.
   - An email arrives at `CONTACT_TO_EMAIL`. Check the spam folder the first time.
   - In Resend, open **Emails** (or **Logs**). Each send is listed with its status
     (for example *Delivered*). A failed send shows the reason here.
5. In the email, click **Reply**. The reply should be addressed to the visitor.

If no email arrives but the message appears in `/admin/messages`, the database is working and the
problem is the email path. Check the Resend logs, then the server logs for the
`Failed to send contact notification email` message.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| No email, and no error on the site | `RESEND_API_KEY` or `CONTACT_TO_EMAIL` is missing, so the notification is skipped on purpose | Set both variables and restart or redeploy |
| Resend log shows *Unauthorized* or *401* | The key is wrong, revoked, or copied with extra spaces | Create a new key and update `RESEND_API_KEY` |
| Resend log shows the sender domain is not verified or *403* | `RESEND_FROM_EMAIL` uses a domain you haven't verified | Finish Part 2 Option B, or unset `RESEND_FROM_EMAIL` for testing |
| Resend log shows *Delivered*, but no email in your inbox | Spam filter, or the sender isn't yet trusted | Check spam, mark the message as "not spam", and keep the DNS records in place |
| Replies go to the wrong address | Expected behaviour is a reply-to set to the visitor. If yours goes to the sender, check the mail client | The code sets `replyTo` to the visitor's address |
| Test messages are blocked for "rate limited" on the site | The contact form throttles the same email address for 60 seconds | Wait a minute, or use a different test address |
| `RESEND_FROM_EMAIL` set but sending fails | The code already wraps the value as `Name <address>`. If you add a display name or angle brackets yourself, the header is malformed | Set only the address, for example `hello@mail.yourdomain.com` |
| DNS records added, but the domain still isn't verified | DNS changes take time, or a record was entered incorrectly. Some registrars add the root domain on their own | Wait, then check the record with `dig TXT <name>` (or `nslookup -type=TXT <name>`). Compare the answer with the value in Resend, and fix the name if the registrar appended the domain twice |
| Changed `RESEND_API_KEY`, but the old behaviour continues | The server still has the old value | Restart the dev server, or redeploy |
| Email arrives from `onboarding@resend.dev` | `RESEND_FROM_EMAIL` is blank | Expected for testing. Set a verified-domain address before going live |

## Questions and answers

**Do I need my own domain?**
For testing, no. Before going live, yes. A verified domain gives you a sender address that matches your site and avoids the testing sender.

**Can I use my Gmail address as the sender?**
No. The sender must be an address on a domain you've verified in Resend. Gmail addresses can't be verified that way.

**Does the visitor get a confirmation email?**
No. The app sends only one email, to `CONTACT_TO_EMAIL`. The visitor sees the on-screen confirmation.

**Can notifications go to more than one person?**
Not without a code change. `CONTACT_TO_EMAIL` is a single address, and the code passes it as one value.

**I submitted the form, but no email arrived. What do I check?**
In this order:

1. Is `/admin/messages` showing the message? If not, the database save failed. See the MongoDB guide.
2. Are `RESEND_API_KEY` and `CONTACT_TO_EMAIL` set, and was the server restarted or redeployed?
3. Does Resend's **Emails** or **Logs** page show the send, and what's its status?
4. Is it in your spam folder?

**Why does the site say "Thanks" if the email failed?**
By design. The email is best-effort, and the message is already saved. The failure is logged on the server, so check the logs or Resend's dashboard.

**Where do messages live if email is turned off?**
At `/admin/messages`. Email is only a copy.

**Will a reply from my inbox reach the visitor?**
Yes. The code sets the reply-to address to the visitor's email, so **Reply** in your mail client addresses them directly.

## Checklist

- [ ] Resend API key created with Sending access
- [ ] Sender domain verified, or testing sender accepted for now
- [ ] `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, and (optional) `RESEND_FROM_EMAIL` set
- [ ] Same variables set in Vercel, and redeployed
- [ ] Test message shows in `/admin/messages`, and the email arrives
- [ ] Reply from the email goes to the visitor
