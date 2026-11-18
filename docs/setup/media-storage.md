# Image storage (Cloudflare R2)

Every image is stored in Cloudflare R2. Uploads are kept as originals, and the site serves pre-made WebP variants
through a custom domain. Nothing is resized on request.

## Buckets

| Bucket | Public? | Holds |
| --- | --- | --- |
| `swati-media` | Yes, through `media.<your domain>` | WebP variants at 160, 320, 640, 960, 1280, 1920 and 2400 px |
| `swati-media-originals` | No | Original uploads. The source the variants are built from |
| `swati-backups` | No | Database dumps, the content snapshot and probe state. See [Disaster recovery](./disaster-recovery.md) |

UAT uses its own set with `-uat` in each name. Keep the UAT and production buckets separate.

## Setup

1. **Create the buckets** in Cloudflare → R2 → Create bucket: `swati-media`, `swati-media-originals` and
   `swati-backups`.
2. **Attach the public domain.** Open `swati-media` → Settings → Custom Domains → Connect domain, and enter
   `media.<your domain>`. The domain's DNS must be on Cloudflare. Don't attach a domain to the other two buckets.
   Turn off the `r2.dev` URL, which is rate-limited.
3. **Add a CORS policy** to `swati-media-originals`. The browser uploads straight to this bucket, so the policy must
   list every origin the admin is used from. Origins must match exactly, with `https://` and no trailing slash:

   ```json
   [
     {
       "AllowedOrigins": ["https://www.<your domain>", "http://localhost:3000"],
       "AllowedMethods": ["PUT"],
       "AllowedHeaders": ["Content-Type"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

4. **Create an API token** under R2 → Manage API tokens with Object Read & Write, limited to the three buckets above.
   Copy the access key ID and secret. Cloudflare shows the secret only once.
5. **Set the environment variables** (`.env.local` for development, Vercel for production):

   | Variable | Value |
   | --- | --- |
   | `NEXT_PUBLIC_MEDIA_BASE_URL` | `https://media.<your domain>` (public) |
   | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | From step 4 (server only) |
   | `R2_MEDIA_BUCKET` | `swati-media` |
   | `R2_ORIGINALS_BUCKET` | `swati-media-originals` |
   | `R2_BACKUP_BUCKET` | `swati-backups` |

6. **Create the health-check canary** in the media bucket:
   `node --env-file=.env.local scripts/ensure-media-canary.mjs`. Run it once per bucket. The media probe checks this
   object every 15 minutes.

## How uploads work

1. The admin uploader asks `/api/admin/upload/sign` for a short-lived upload URL.
2. The browser sends the file straight to `swati-media-originals`.
3. `/api/admin/upload/process` reads the original, writes the seven WebP variants to `swati-media`, and returns the
   public ID the record stores.
4. An upload that is never saved is removed by `/api/admin/upload/discard`. Deleting an image in admin removes its
   variants and original.

Files must be JPEG, PNG, WebP, AVIF or GIF, up to 15 MB. Variants are never enlarged, so a small original keeps its
size.

## Troubleshooting

- **Upload fails with a CORS error in the browser.** The site's origin isn't in the originals bucket's CORS policy.
  Add it exactly as shown in the browser console.
- **Upload fails with 403 from R2.** The API token doesn't include the bucket, or the bucket name in the environment
  doesn't match.
- **Images don't load.** Check `NEXT_PUBLIC_MEDIA_BASE_URL` and that the custom domain shows as Active on the bucket.
  Then open `https://media.<your domain>/swati-portfolio/_health/canary-w160.webp`.
