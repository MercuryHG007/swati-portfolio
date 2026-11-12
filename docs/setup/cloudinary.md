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

## Part 4: Use a separate account for UAT

Production and UAT should use different Cloudinary accounts. Otherwise a delete in UAT can remove
a live image (see the Q&A below).

1. Use one account for production and a different one for UAT. Create the second account with a
   different email address, such as a `+uat` alias.
2. Repeat Parts 2 and 3 for that account. Use its cloud name and API credentials in:
   - the **Preview** rows in Vercel, and
   - `.env.local` for local work.
3. Keep each account's values in its own rows only: production values under **Production**, UAT values
   under **Preview** and in `.env.local`.
4. Redeploy production and UAT after changing the variables.

Images uploaded to UAT stay in the UAT account. Images already in production stay in production.
Copy any images you need to test with by re-uploading them through the UAT admin.

### If production moves to a new account

Each image URL includes the cloud name, so records created on the old account keep pointing at it.
Once production uses a new account, either:

- re-upload the images for each existing artwork, series, exhibition and About record to the new
  account, or
- delete those records (in the admin, or directly in Atlas) and create them again.

Don't point UAT or local work at the old account while any database still refers to it. A delete in
one environment removes the image from the account it points to.

---

## Part 5: Verify

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

**Can UAT use the old production account?**
No, not while any database refers to it. UAT's delete would remove images that production records still
use. Keep the old account as an archive, or delete it once no record refers to it.

**Can I use the same Cloudinary account for UAT?**
You can, but don't. Deleting an artwork or image in the admin calls Cloudinary's delete on its public
ID. If UAT's database holds the same IDs as production, deleting in UAT removes the live image.
Use a separate account (Part 4).

**Do I need a Cloudinary upload preset for UAT?**
No. The same signed-upload rules apply to every account.

## Checklist

- [ ] Cloud name, API key, and API secret copied
- [ ] Four variables set in `.env.local`
- [ ] Same variables set in Vercel, and redeployed
- [ ] `/api/health/cloudinary` returns `"ok":true`
- [ ] Test upload appears in the admin and on the public site
- [ ] UAT uses its own Cloudinary account (Part 4)
