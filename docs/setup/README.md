# Setup guides

Step-by-step instructions for configuring the external services this app depends on.
Each guide lists the accounts to create, the values to copy, and where each value goes.

| Guide | Covers |
| --- | --- |
| [MongoDB Atlas](./mongodb.md) | Database, `MONGODB_URI`, first admin login. **Required** |
| [Cloudinary](./cloudinary.md) | Image hosting and uploads. **Required** |
| [Resend](./resend.md) | Contact-form email notifications. Optional |
| [Google Analytics 4](./ga4.md) | Website tracking, the admin analytics page, and the contact-form lead source. Optional |
| [Gemini](./gemini.md) | The AI artwork assistant on the admin artwork form. Optional |
| [Cloudflare Turnstile](./turnstile.md) | Captcha on the contact form. Optional, but enable it in production |

Set up in this order: MongoDB, then Cloudinary, then Resend, GA4 and Gemini. The app won't start
without MongoDB and Cloudinary, and the admin can't sign in until a first admin exists.

## Required app variables (NextAuth)

These aren't tied to a single service. They sign admin login sessions.

| Variable | Notes |
| --- | --- |
| `NEXTAUTH_SECRET` | Random string used to sign sessions. Generate one with `openssl rand -base64 32`. Changing it signs out every admin |
| `NEXTAUTH_URL` | `http://localhost:3000` for local development. Not needed on Vercel, because the app trusts the request host there |

Set them in `.env.local` for local work, and in Vercel for production. Use a different
`NEXTAUTH_SECRET` for production than for local development.

## Production, UAT and local values

Production and UAT run from the same code but must not share data or analytics. Set each value below
for the environment shown. Vercel's **Production** and **Preview** rows are the two columns that matter.

| Variable | Production | UAT (Vercel Preview) | Local (`.env.local`) |
| --- | --- | --- | --- |
| `MONGODB_URI` | database `swati_portfolio_prod` | database `swati_portfolio` | `swati_portfolio` (shared with UAT) |
| `NEXTAUTH_SECRET` | production secret | separate secret | separate secret |
| `NEXTAUTH_URL` | not set | not set | `http://localhost:3000` |
| `CLOUDINARY_*` and `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | production account | separate UAT account | UAT account |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | production `G-…` | UAT `G-…` | blank |
| `GA4_PROPERTY_ID` | production property | UAT property | UAT property |
| `GA4_CLIENT_EMAIL`, `GA4_PRIVATE_KEY` | same service account | same | same |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | production widget | UAT widget | blank |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | same | same | same |
| `CONTACT_TO_EMAIL` | your inbox | a test inbox | a test inbox |
| `GEMINI_API_KEY` | same | same | same |

Why these differ:
- UAT edits must not change live data, so UAT has its own database.
- Deleting in the admin also deletes Cloudinary assets. UAT needs its own account, or its database
  would hold the same image IDs as production.
- UAT form tests shouldn't email your real inbox.
- Local development should not count in GA4 or use production services.
- Local and UAT share `swati_portfolio`, so local edits show up in UAT. Use `swati_portfolio_dev`
  in `.env.local` to keep them apart.

Create a UAT admin login by running [create-admin.mjs](../../scripts/create-admin.mjs) with the UAT
`MONGODB_URI`, not the production one.

Rules for every guide:

- Secrets (private keys, API keys) go only in `.env.local` locally and in the hosting dashboard
  (Vercel) for production. Never commit them, and never paste them into chat or issues.
- Values that begin with `NEXT_PUBLIC_` are copied into the browser build, so they are public.
  Changing one needs a redeploy.
