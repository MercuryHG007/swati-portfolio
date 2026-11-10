# Cloudinary setup

Cloudinary hosts all artwork, series cover, exhibition, and video images. Uploads go through the
server (`src/app/api/admin/upload/route.ts`), and pages load images from `res.cloudinary.com`
using the public cloud name.

## What the code expects

| Variable | Used by | Public? |
| --- | --- | --- |
| `CLOUDINARY_CLOUD_NAME` | `src/lib/cloudinary.ts`, the AI artwork assistant route | No, but not secret |
| `CLOUDINARY_API_KEY` | `src/lib/cloudinary.ts` | No |
| `CLOUDINARY_API_SECRET` | `src/lib/cloudinary.ts` | **No. Secret.** |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Image URLs in the browser (`CldImage`, the image uploader, the gallery) | Yes |

Two things to know:

- `src/lib/cloudinary.ts` throws at startup if any of the three server values is missing. The app
  won't run without them.
- `next.config.ts` allows images only from `res.cloudinary.com`. Keep the default delivery domain.

Uploads are signed with the API secret, so **no upload preset is needed**. Files up to 15 MB are
accepted (JPEG, PNG, WebP, AVIF, GIF). Images are resized to a maximum of 2500 px on upload.

---

## Part 1: Create or open an account

1. Go to [cloudinary.com](https://cloudinary.com) and sign up, or sign in.
2. You land on the **Dashboard** after signing in.

---

## Part 2: Copy the cloud name and API credentials

1. On the **Dashboard**, find the **Product environment credentials** panel (or the account details
   box). Copy:
   - **Cloud name**. This is `CLOUDINARY_CLOUD_NAME` and `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`.
   - **API Key**. This is `CLOUDINARY_API_KEY`.
   - **API Secret**. Click the reveal button to show it. This is `CLOUDINARY_API_SECRET`.
2. If you don't see the credentials on the Dashboard, go to **Settings** (gear icon) →
   **Access Keys** (or **API Keys**), where the same values are listed.

Keep the API secret private. If it leaks, go to **Settings → Access Keys**, regenerate it, and
update every environment that uses it.

---

## Part 3: Set the variables

Add them to `.env.local`:

```bash
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your-api-secret
# Public: same cloud name, used by the browser
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
```

The two cloud-name values must be identical. The app uses the server copy for uploads and the
public copy for image URLs.

Then add the same four variables in **Vercel → Project → Settings → Environment Variables**, and
redeploy. `NEXT_PUBLIC_` values are built into the browser code, so they take effect only after a
new deployment.

---

## Part 4: Verify

1. Start the app (`npm run dev`).
2. Open [http://localhost:3000/api/health/cloudinary](http://localhost:3000/api/health/cloudinary).
   Expected output: `{"ok":true,"status":"ok"}`. This calls Cloudinary's ping endpoint with your
   API key and secret, so a passing result means the credentials are valid.
3. Sign in to `/admin/artworks/new`, upload a test image, and save. The image should appear in
   the artwork list and on the public site.
4. Check the Cloudinary **Media Library** for the upload. It is stored in a folder named after the
   upload context, for example `swati-portfolio/artworks`.

The `/api/health/cloudinary` endpoint is public and returns only the ping status. It never
returns the credentials.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Missing CLOUDINARY_CLOUD_NAME/CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET environment variable(s)` | One of the three server variables is missing, or the server wasn't restarted | Check `.env.local` and restart. On Vercel, redeploy |
| `/api/health/cloudinary` returns `ok: false` with an authentication error | Wrong API key or secret, usually copied with extra spaces | Copy them again from **Settings → Access Keys** |
| Upload fails with "Unsupported file type" | The file isn't JPEG, PNG, WebP, AVIF, or GIF | Convert the file, for example to JPEG |
| Upload fails with "File exceeds 15MB limit" | The file is larger than the app's limit | Compress the image before uploading |
| Images are missing on the site, but the admin shows them | `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` differs from the server value, or the variable wasn't redeployed | Make the two values identical and redeploy |
| Next.js error about an unconfigured image host | The image URL is not on `res.cloudinary.com` | Re-upload through the admin rather than pasting an external URL |
| Build fails on Vercel with the missing-variable error | The modules read these variables when they load, and the build loads them too | Set all four variables in Vercel for every environment that builds, then redeploy |
| Upload fails with an error message | Wrong API secret, a network problem, or a file Cloudinary rejects | Run the `/api/health/cloudinary` check first. If that passes, try a smaller JPEG |
| Folder name rejected and images land in `swati-portfolio` | Folder names may contain only letters, digits, `/`, `_`, and `-`. Other names fall back to the default folder | Use letters, digits, and hyphens |
| Full-size originals are smaller on the site | Uploads are resized to at most 2500 px on the longest side. Original files aren't kept at full size | Expected. Upload at 2500 px or below if you need the exact file |
| Old image still appears after you remove it | The admin deletes the Cloudinary asset when you remove an image or delete an artwork. A cached copy in a browser or CDN may still show briefly | Hard-refresh. If it persists, check the Media Library |

## Questions and answers

**Do I need an upload preset?**
No. The server signs each upload with your API secret, so no preset is needed in the Cloudinary settings.

**Can visitors see my API secret?**
No. Only `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` is sent to the browser. The API key and secret stay on the server.

**What's the upload size limit?**
The app allows files up to 15 MB. That limit is set in the app's upload route, not in Cloudinary. Change it there if you need a different limit.

**Can I use images hosted somewhere else?**
Not through the admin. The Next.js image settings allow only `res.cloudinary.com`. Supporting another host means changing `next.config.ts`.

**Where can I see the uploads?**
In the Cloudinary dashboard, open **Media Library**.

**Do the free limits cover this site?**
Check the usage panel on the Cloudinary dashboard for your plan's storage and bandwidth. Don't assume a limit. Usage grows with the number of full-size images.

**Is it safe to rotate the API secret?**
Yes, if your Cloudinary account offers a way to regenerate it. If the secret leaks, regenerate it in the Cloudinary settings, then update `CLOUDINARY_API_SECRET` locally and on Vercel, and redeploy. Until you update the app, uploads fail.

**Does deleting an artwork delete its images from Cloudinary?**
Yes. The app deletes the assets when you delete an artwork, or remove an image from one. Deleted images can't be recovered from the app.

## Checklist

- [ ] Cloud name, API key, and API secret copied
- [ ] Four variables set in `.env.local`
- [ ] Same variables set in Vercel, and redeployed
- [ ] `/api/health/cloudinary` returns `"ok":true`
- [ ] Test upload appears in the admin and on the public site
