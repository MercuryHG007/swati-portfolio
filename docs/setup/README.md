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

Rules for every guide:

- Secrets (private keys, API keys) go only in `.env.local` locally and in the hosting dashboard
  (Vercel) for production. Never commit them, and never paste them into chat or issues.
- Values that begin with `NEXT_PUBLIC_` are copied into the browser build, so they are public.
  Changing one needs a redeploy.
