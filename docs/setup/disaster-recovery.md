# Disaster recovery

What keeps the site up when MongoDB or Cloudinary fails, and how to restore after data loss.

## What happens in each failure

| Failure | What visitors see | What you do |
| --- | --- | --- |
| **MongoDB unreachable** | Public pages, portfolio listings and filters are served from the content snapshot, read-only. Contact enquiries are saved encrypted to R2 and still reach your inbox by email. Admin is unavailable. | Check Atlas status. Nothing else is needed. |
| **MongoDB emptied or wiped, still reachable** | If the database has no published artworks at all, reads are served from the snapshot, so pages keep their content. A single unpublished piece is not affected. The snapshot job refuses to overwrite a snapshot that has artworks with an empty one. | [Restore the database](#restore-the-database). |
| **Cloudinary down** | Images load straight from Cloudinary in the normal case. When a load fails, the browser retries it through the image route, which serves the copy in the R2 mirror. Images keep showing with no action needed. Social previews keep working. The health probe emails you within about 30 minutes. | Check the alert. Nothing else is needed. |
| **Cloudinary plan limit reached** | Same as above. You get a warning email at 80% of plan usage and a critical one at 100%. | Upgrade the plan or wait for the reset. |
| **Cloudinary account lost** | Same as above, and the mirror still holds every image. | [Restore images](#restore-images). |
| **Deploy during an outage** | The build prerenders some pages, so it can fail. The last deployment keeps serving. | Wait for the database, or roll back in Vercel. |

## Limits

- **Snapshot freshness.** The snapshot is rebuilt after every admin save and daily at 20:30 UTC.
  Changes made directly in MongoDB aren't captured until the next rebuild. The portfolio catalogue is in the
  snapshot too, so build one after each deploy (step 7 of the setup).
- **Contact enquiries saved during an outage** reach the admin inbox when the nightly job replays them, which can be
  up to 24 hours later. They are also emailed straight away.
- **Crops.** Cropped images use CSS `object-fit: cover`, centred on the picture (or a face point on the About page).
  Cloudinary's automatic subject crop is no longer used, so edge crops in the grid can differ slightly.
- **Mirror lag.** Images uploaded through admin are copied to R2 immediately. Images that existed before the mirror
  job first ran are copied by the nightly job.
- **Lightbox.** The full-size viewer loads straight from Cloudinary and has no retry. If Cloudinary is down, its images
  won't show, though the page images still fall back.
- **Admin, messages and analytics** need the database.
- **Not a full backup.** The snapshot holds only what public pages show. The nightly dump is the full backup.

## How it works

- **Read fallback.** Public read queries in [queries.ts](../../src/lib/queries.ts) are wrapped by
  [resilient-read.ts](../../src/lib/resilient-read.ts). They try MongoDB first. After a failure the
  wrapper serves the snapshot and skips MongoDB for 60 seconds. Connection timeouts are 3 seconds
  ([mongodb.ts](../../src/lib/mongodb.ts)).
- **Portfolio listings.** [portfolio-fallback.ts](../../src/lib/portfolio-fallback.ts) filters, shuffles and counts the
  snapshot's catalogue with the same rules as the MongoDB queries, so filters, pages and facets match the live site.
- **Snapshot.** [content-snapshot.ts](../../src/lib/content-snapshot.ts) runs every wrapped query with the arguments
  the site uses and stores the results in R2 at `content/<database name>/snapshot.json`. Each admin save schedules a
  rebuild after the response, and [a daily Vercel cron](../../vercel.json) rebuilds it too.
- **Image route.** [/api/media](../../src/app/api/media/[...publicId]/route.ts) is the image URL for OG tags and
  JSON-LD, and the fallback for the browser. The admin uploader still previews Cloudinary directly.
  - **Normal page load:** the browser requests images straight from Cloudinary's CDN, one request each. The route
    isn't involved, so there is no extra round trip and no load on Vercel.
  - **Browser fallback:** if a direct load fails, the browser requests the same image once more from the route with
    `proxy=1`. The route tries Cloudinary with a 3-second timeout, then the copy in the R2 mirror, resized with the same
    options. A failing Cloudinary is skipped for 60 seconds per instance. This covers an outage the probe hasn't
    noticed yet.
  - **OG and JSON-LD:** crawlers get the route URL, which always serves the image (Cloudinary first, then R2).
  - **Allowed sizes:** widths must be ones next/image requests (16 to 2048, or 2400), plus 176 for the gallery
    thumbnail. Other sizes return `400`, so random sizes can't create cache entries or spend Cloudinary transformations.
  Responses carry `X-Media-Source` (`cloudinary` or `r2`) and, after a fallback, `X-Media-Fallback` (the reason).
  Format defaults to WebP. `f=auto` picks AVIF or WebP from the browser's `Accept` header.
  Shared options live in [media-options.ts](../../src/lib/media-options.ts) and the resize rules in
  [media-resize.ts](../../src/lib/media-resize.ts).
- **Contact enquiries.** If saving to MongoDB fails, the message is encrypted and written to R2 under
  `contact-spool/`. The nightly cron moves each one into the database and deletes the file. Replays are idempotent.
- **Backups.** [disaster-recovery.yml](../../.github/workflows/disaster-recovery.yml) runs nightly. It compares a
  fingerprint of the collections (counts and latest `updatedAt`) with the last backup, and skips the dump when nothing
  changed. A full dump is taken at least weekly, and whenever you run the workflow with `force` set. Dumps are
  encrypted with AES-256-GCM and uploaded to R2. They keep 30 days plus the first dump of each month. Each dump is named
  by its UTC time, for example `backups/mongo/2026-11-17T07-19-15Z.archive.gz.enc`.
  The same workflow copies new Cloudinary images to the mirror.
- **Monitoring.** [probe-media-health.mjs](../../scripts/probe-media-health.mjs) runs every 15 minutes in
  [media-health.yml](../../.github/workflows/media-health.yml). It fetches a canary image straight from Cloudinary,
  pings the Cloudinary API, reads the plan usage, and checks the canary copy in the mirror. The result is saved to
  `ops/media-health.json` in the backup bucket. Alerts are emailed when the state changes. A down or critical state
  needs two failed runs in a row.

## One-time setup

1. **Create two R2 buckets** in Cloudflare:
   - `swati-backups` (private): database dumps and the snapshot.
   - `swati-media-mirror` (private): copies of Cloudinary images. The server reads it, so it doesn't need public access.
2. **Create an R2 API token** with Object Read & Write on both buckets. Note the account ID, access key ID and secret.
3. **Generate the backup passphrase** with `openssl rand -base64 48`. Store it in a password manager. Without it,
   no backup can be decrypted.
4. **Add these GitHub Actions secrets:** `MONGODB_URI` (production), `BACKUP_ENCRYPTION_KEY`, `R2_ACCOUNT_ID`,
   `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BACKUP_BUCKET`, `R2_MIRROR_BUCKET`, and the production
   `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
5. **Add these Vercel environment variables** (Production): `CLOUDINARY_CLOUD_NAME` (the image route reads it on the
   server), `BACKUP_ENCRYPTION_KEY` (encrypts contact enquiries spooled during an outage), `R2_ACCOUNT_ID`,
   `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BACKUP_BUCKET`, `R2_MIRROR_BUCKET` and `CRON_SECRET`.
   Use a random value for `CRON_SECRET`. Vercel Cron sends it automatically.
6. **Run the workflow once** from Actions → Disaster recovery → Run workflow. Check that the two buckets have objects.
7. **Build the first snapshot:**
   `curl -H "Authorization: Bearer $CRON_SECRET" https://<your-site>/api/cron/content-snapshot`.

8. **Create the health-check canary** (once per Cloudinary account, and once for each R2 mirror):
   `node --env-file=.env.prod scripts/ensure-media-canary.mjs`. It creates `swati-portfolio/_health/canary` in Cloudinary
   and in the mirror, and does nothing if they already exist.
9. **Add the alert secrets for the media probe:** `RESEND_API_KEY`, `ALERT_EMAIL` (where alerts go) and optionally
   `RESEND_FROM_EMAIL`. Then run **Media health** once from Actions. The probe reuses the Cloudinary and R2 secrets
   from step 4.
10. **Add two uptime monitors** in a service such as UptimeRobot or Better Stack, both checking for HTTP 200:
    `https://<your-site>/api/health/media` (503 when Cloudinary is down or critical, or when the probe hasn't run for
    45 minutes) and `https://<your-site>/api/health/snapshot` (503 when the content snapshot is missing or older than
    36 hours). These monitors don't depend on the probe or on GitHub, so they can alert when either one stops.

UAT and local leave every R2 variable blank except the restore-drill keys. Blank means no snapshot writes and no mirror
copies, so UAT test data can't reach the production buckets. Vercel's R2 variables belong in the **Production** scope
only. Local restore drills pass the bucket on the command line, because `.env.local` leaves it blank:

```bash
R2_BACKUP_BUCKET=swati-backups node --env-file=.env.local scripts/restore-mongo-from-r2.mjs --list
```

Node doesn't overwrite variables already set in the shell, so the blank file value doesn't interfere.
The backup, mirror and media-health workflows only ever point at production.

## Restore the database

The restore script remaps the dump from `--source-db` (default `swati_portfolio_prod`) to the `--target-db` you name,
Dumps made from UAT or local hold `swati_portfolio`, so pass `--source-db swati_portfolio` for those.
So a restore into a scratch database never touches production. The target URI must not include a database name:
a database in the URI filters the dump, and the restore would silently write nothing.

Restoring into a different database name needs the snapshot key copied first, because the snapshot is keyed by
database name: copy `content/<old name>/snapshot.json` to `content/<new name>/snapshot.json`.

```bash
# List available dumps
node --env-file=.env.prod scripts/restore-mongo-from-r2.mjs --list

# Restore the newest dump into the scratch database
node --env-file=.env.prod scripts/restore-mongo-from-r2.mjs latest \
  --target-uri "mongodb+srv://USER:PASS@CLUSTER/" --target-db swati_portfolio_restore_test --confirm
```

Restore a specific dump by passing a key from `--list` instead of `latest`:

```bash
node --env-file=.env.prod scripts/restore-mongo-from-r2.mjs backups/mongo/2026-11-17T07-19-15Z.archive.gz.enc \
  --target-uri "<target-uri>" --target-db swati_portfolio_restore_test --confirm
```

Check that the newest dump decrypts without touching any database. `--dry-run` downloads and decrypts the dump and
reports its size, but never runs `mongorestore`. Use it to confirm the backup and `BACKUP_ENCRYPTION_KEY` still match
before you need a restore:

```bash
node --env-file=.env.prod scripts/restore-mongo-from-r2.mjs latest \
  --target-uri "<target-uri>" --target-db swati_portfolio_restore_test --dry-run
```

**Recovery into production (only after the production database is confirmed lost):**

```bash
node --env-file=.env.prod scripts/restore-mongo-from-r2.mjs latest \
  --target-uri "mongodb+srv://<prod-user>:<password>@<cluster-host>/?<options>" \
  --target-db swati_portfolio_prod --overwrite-source --allow-prod --confirm
```

Existing collections in production are replaced. If you restored into a different database name, point `MONGODB_URI`
in Vercel at it, redeploy, and copy the snapshot key as described above.
`mongorestore` and `mongodump` must be on your PATH (the MongoDB Database Tools).

Restore drill check: once a quarter, restore into `swati_portfolio_restore_test`, run the site locally with
`MONGODB_URI` pointed at it, check the homepage and admin, then drop that database.

## Restore images

The mirror keeps each image under its Cloudinary `public_id`, which is the same value stored in MongoDB. If the
Cloudinary account is lost, upload each mirror object to the new account with the same `public_id`, and the
database needs no changes. This isn't scripted yet.

To refresh the mirror manually: `node --env-file=.env.local scripts/mirror-cloudinary-to-r2.mjs`.

## Checking health

- `/api/health/media` returns 503 when Cloudinary is down or critical, or when the probe hasn't run for 45 minutes.
  The body includes the last check time, the reasons, delivery latency and plan usage. It reads the saved state from R2,
  so it still answers while the database is down.
- `/api/health/snapshot` returns 503 when the content snapshot is missing or more than 36 hours old.
- `/api/health/db` and `/api/health/cloudinary` return 500 when a dependency is down. `/api/health/cloudinary` only
  checks the Cloudinary management API, not image delivery, so use `/api/health/media` to find delivery problems.
- To see where an image came from, check the `X-Media-Source` and `X-Media-Fallback` headers, for example with
  `curl -I https://<your-site>/api/media/<public_id>?w=800`.
- Point an uptime monitor at the homepage as well.

## Fire drill

Run this after a deploy that touches the fallbacks, and once a quarter. Use a copy of the repository, not your
usual dev server, because two dev servers in one folder fight over `.next`. Keep the copy's environment on UAT or
local values, and clear the Cloudinary and database variables below only in the copy.

1. **Image fallback.** Start the copy with an invalid Cloudinary cloud name:
   `CLOUDINARY_CLOUD_NAME=doesnotexist NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=doesnotexist npx next dev -p 3100`.
   Then run `curl -I "http://localhost:3100/api/media/swati-portfolio/artworks/<public_id>?w=1200&proxy=1"`. Expect `200`,
   `X-Media-Source: r2`, and `X-Media-Fallback: not_found`. Open a page and confirm the images show. The browser loads
   the bogus Cloudinary URLs, fails, and retries through the route.
2. **Database outage.** Start a copy with an unreachable `MONGODB_URI` and the same database name, for example
   `mongodb://127.0.0.1:9/swati_portfolio?serverSelectionTimeoutMS=2000&directConnection=true`. The snapshot is keyed
   by that name, so it must match. Check `/`, `/portfolio`, an artwork page, `/contact`, and
   `/api/health/snapshot` (expect `200`). `/api/health/db` is expected to return 500.
3. **Contact enquiries during an outage.** Still with the database down, submit the contact form. Check that an object
   appears under `contact-spool/` in the backup bucket. Then call the cron route with the `CRON_SECRET` from that
   environment, and check the response's `contactSpool.replayed` count and that the message is in the admin inbox.
4. **Monitoring.** Run `node --env-file=.env.local scripts/probe-media-health.mjs --dry-run` with a bad
   `CLOUDINARY_CLOUD_NAME`. Expect `status: "down"` and `effectiveStatus: "healthy"`, since one failure isn't enough.
   A dry run doesn't store the count. To see the second failure flip the status and send the alert, run it twice
   without `--dry-run`. Do this only against UAT buckets, because real runs write state and can send email.
5. **Restore.** Follow [Restore the database](#restore-the-database) with `--dry-run` against the newest dump.
