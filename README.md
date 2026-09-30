# Swati Garg — Watercolor Artist Portfolio

A Next.js (App Router) portfolio and admin CMS for a watercolor/mixed-media artist: public
pages for browsing artwork, series, exhibitions and a contact form, plus an authenticated
admin area for managing all of it.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (CSS-first `@theme` tokens in `src/app/globals.css` — no `tailwind.config.js`)
- **MongoDB Atlas** + **Mongoose** for data
- **Cloudinary** for image hosting/transforms (`next-cloudinary`'s `CldImage`)
- **NextAuth v5** (Credentials provider) for admin authentication
- **Resend** for contact-form email notifications

Fonts: Inter (sans) + Space Mono (accent/mono), loaded via `next/font/google`.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in the real values below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the public site, and
[http://localhost:3000/admin/login](http://localhost:3000/admin/login) for the admin area.

### Environment variables (`.env.local`)

| Variable | Required | Notes |
| --- | --- | --- |
| `MONGODB_URI` | yes | MongoDB Atlas connection string |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | yes | Server-side Cloudinary SDK config |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | yes | Same cloud name, exposed client-side for `CldImage` |
| `NEXTAUTH_SECRET` | yes | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | yes in dev | `http://localhost:3000` locally; not required on Vercel since `trustHost: true` trusts the request host |
| `RESEND_API_KEY` / `CONTACT_TO_EMAIL` | optional | Contact form still saves to Mongo without these; email notification is just skipped |
| `RESEND_FROM_EMAIL` | optional | Defaults to Resend's sandbox sender until a custom domain is verified |

### Useful scripts

```bash
npm run create-admin -- <email> <password>   # create/reset an admin login
npm run seed-demo                            # seed placeholder demo content
npm run lint
npm run build
```

## Project structure

- `src/app/(site)/` — public pages (Home, Portfolio, Artwork, Exhibitions, About, Contact),
  each with its own root layout (header/footer).
- `src/app/(admin)/` — authenticated admin CRUD screens, with a separate root layout (no
  public header/footer).
- `src/models/` — Mongoose schemas (Series, Artwork, Medium, Subject, Exhibition, About,
  ContactMessage, AdminUser).
- `src/lib/queries.ts` — published-only reads for the public site.
- `src/lib/admin-queries.ts` — unfiltered reads for the admin screens.
- `src/proxy.ts` — Next.js 16's `middleware.js` → `proxy.js` convention; protects `/admin/*`.

## Deployment

Target platform is Vercel. Set the environment variables above in the Vercel project settings
before deploying.

