# Cloudflare Turnstile setup

Turnstile is the captcha on the contact form. Visitors who fail the check are sent back to the form
with a captcha error, and nothing is saved or emailed. The check runs on the server before the
rate limit, so bots that fail it don't use up an IP's quota.

## What the code expects

| Variable | Used by | Public? |
| --- | --- | --- |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Shows the widget on `/contact` (`src/lib/turnstile.ts`) | Yes |
| `TURNSTILE_SECRET_KEY` | Checks the visitor's token with Cloudflare (`src/lib/turnstile.ts`) | **No. Secret.** |

Set both keys or neither. The code handles the mismatch cases this way:

| Site key | Secret key | What happens |
| --- | --- | --- |
| blank | blank | No widget, no check. This is the local default, so development works without keys |
| set | set | Widget shows, and every token is verified with Cloudflare. Use this in production and UAT |
| set | blank | Widget shows, but every submission is rejected. The gap is deliberate, so it gets noticed |
| blank | set | No widget, so no token, so every submission is rejected |

Because the site key is public, the widget only loads on hostnames you list in Cloudflare (Part 1).
The secret key must stay on the server, never in the browser.

---

## Part 1: Create a widget for each environment

Create one widget for production and one for UAT. Each widget lists only its own hostname, so a
key set for one environment can't be used on the other.

1. Sign in to the [Cloudflare dashboard](https://dash.cloudflare.com). Create a free account if you
   don't have one.
2. Open **Turnstile** in the left menu. If you don't see it, use the dashboard search.
3. Click **Add widget**.
4. Production widget:
   - Widget name: `swati-portfolio-prod`.
   - Hostnames: `www.artistswatigarg.com`.
   - Widget mode: **Managed** (the default). Visitors see a checkbox or a short automatic check.
   - Click **Create**.
5. UAT widget: repeat with name `swati-portfolio-uat` and hostname `uat.artistswatigarg.com`. Use
   the host you attached to the UAT branch in Vercel.
6. Each widget shows a **Site Key** and a **Secret Key**. Copy both for each widget and keep them
   apart.

Preview URLs on `*.vercel.app` change with each deployment, and they aren't listed. Don't rely on
them. Use UAT's own hostname.

---

## Part 2: Set the variables locally

Add these to `.env.local`. For local development, leave both blank (see the table above). Then you
don't need to list `localhost` in Cloudflare.

```bash
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

If you want the widget locally, set both keys from the UAT widget and add `localhost` to that
widget's hostnames in Cloudflare. Then restart `npm run dev`.

---

## Part 3: Set the variables in Vercel

In **Vercel → Project → Settings → Environment Variables**:

| Variable | Production | Preview (UAT) |
| --- | --- | --- |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | production site key | UAT site key |
| `TURNSTILE_SECRET_KEY` | production secret key | UAT secret key |

Don't restrict the Preview rows to a Git branch. Branch names change, and a restricted variable
would silently stop applying. Leave **Development** empty.

Redeploy production and UAT after changing these values. `NEXT_PUBLIC_` values are built into the
browser code, so they take effect only in a new deployment.

---

## Part 4: Verify

1. Open the production contact page at `https://www.artistswatigarg.com/contact`. The widget
   should show. If it doesn't, the site key is missing or the hostname isn't listed.
2. Send a test message. You should see the "Thanks" confirmation, not a captcha error.
3. Repeat on the UAT contact page. Use the UAT hostname, not `*.vercel.app`.
4. In the Cloudflare dashboard, open the widget. Its analytics should show a few requests for each
   environment, and the production widget shouldn't count UAT traffic.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| No widget on the contact page | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is blank in that environment, or the build predates the variable | Set the key, then redeploy |
| Widget shows an error, or never finishes | The current hostname isn't listed on the widget | Add the hostname in Cloudflare (Part 1). Preview `*.vercel.app` hosts need their own entry or are not supported |
| Every submission returns a captcha error | The secret key is blank while the site key is set, or the secret is from a different widget than the site key | Copy both keys from the same widget and set both |
| Every submission returns a captcha error, and the secret is set | Keys are from different widgets, or the secret has extra spaces | Recopy both keys from one widget |
| Captcha error on a real visit | The visitor's check expired, or they reloaded the form after the check | Ask them to complete the check again and submit |
| Works in production but not on UAT | UAT's hostname isn't listed on its widget, or UAT still uses the production keys | Fix the UAT widget or variables, then redeploy UAT |

## Questions and answers

**Do I need Turnstile for the site to work?**
No. With both keys blank, the contact form works without a captcha. You should enable it in production
because it blocks most spam bots.

**Why two widgets?**
A widget only loads on the hostnames you list. Separate widgets keep production and UAT
independent, and each environment's traffic appears under its own widget.

**Why not add the UAT hostname to the production widget?**
You can, but then UAT's test traffic and production's traffic share one widget. Separate widgets
are easier to read and easier to rotate.

**Can I use the same keys locally as in production?**
Not recommended. Leave them blank locally, unless you're testing the widget itself. Then use the
UAT widget and list `localhost`.

**What if the secret key leaks?**
Rotate it in the Cloudflare widget settings. Update `TURNSTILE_SECRET_KEY` in `.env.local` and in
Vercel, then redeploy. Until you do, the form rejects every submission.

**Does a rejected submission get saved?**
No. The check runs before the message is saved or emailed.

## Checklist

- [ ] Production widget created with the `www` hostname; both keys copied
- [ ] UAT widget created with the UAT hostname; both keys copied
- [ ] Local `.env.local` keys left blank (or set from UAT, with `localhost` listed)
- [ ] Production variables set in Vercel, and production redeployed
- [ ] UAT variables set in Vercel, and UAT redeployed
- [ ] Test message sent on production and on UAT, with the "Thanks" confirmation
