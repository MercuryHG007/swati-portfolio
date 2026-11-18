# Disaster recovery

What keeps the site up when MongoDB or image storage fails, and how to restore after data loss.

## What happens in each failure

| Failure | What visitors see | What you do |
| --- | --- | --- |
| **MongoDB unreachable** | Public pages, portfolio listings and filters are served from the content snapshot, read-only. Contact enquiries are saved encrypted to R2 and still reach your inbox by email. Admin is unavailable. | Check Atlas status. Nothing else is needed. |
| **MongoDB emptied or wiped, still reachable** | If the database has no published artworks at all, reads are served from the snapshot, so pages keep their content. A single unpublished piece is not affected. The snapshot job refuses to overwrite a snapshot that has artworks with an empty one. | [Restore the database](#restore-the-database). |
| **R2 media domain down** | Images don't load until R2 or the media domain recovers. The health probe emails you within about 30 minutes. | Check Cloudflare status and the alert. Nothing else is needed. |
| **Cloudflare account or R2 data lost** | Images are broken. Pages keep working while MongoDB is up, but the content snapshot is in R2 too, so the read fallback is gone until it's rebuilt. | Restore the images from the off-site copy with [Restore images](#restore-images). If MongoDB is also lost, [restore the database](#restore-the-database) first. |
| **Media objects lost or deleted** | Affected images are broken. | [Restore images](#restore-images). |
| **Deploy during an outage** | The build prerenders some pages, so it can fail. The last deployment keeps serving. | Wait for the database, or roll back in Vercel. |

## Limits

- **Snapshot freshness.** The snapshot is rebuilt after every admin save and daily at 20:30 UTC.
  Changes made directly in MongoDB aren't captured until the next rebuild. The portfolio catalogue is in the
  snapshot too, so build one after each deploy (step 7 of the setup).
- **Contact enquiries saved during an outage** reach the admin inbox when the nightly job replays them, which can be
  up to 24 hours later. They are also emailed straight away.
- **Crops.** Cropped images use CSS `object-fit: cover`, centred on the picture (or a face point on the About page).
  Variants are never cropped on the server.
- **Images are served from R2 only.** The off-site copy in the backup repo is for recovery, not delivery. It holds the
  originals, and the WebP variants are rebuilt from them on restore. Images deleted in admin stay in the copy, so they
  can be recovered.
- **Build-time URL.** `NEXT_PUBLIC_MEDIA_BASE_URL` is compiled into the site, so moving images to a new domain needs a
  redeploy.
- **Domain renewal.** `artistswatigarg.com` renews at Porkbun. A lapsed domain takes the media domain down, so keep
  auto-renew on.
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
- **Image delivery.** Pages load `https://media.<your domain>/<public_id>-w<width>.webp` straight from R2 through its
  custom domain. Each upload is stored as seven pre-made WebP widths (160 to 2400 px), and the browser asks for the
  nearest one, so nothing is resized on request. Uploads go from the browser to the originals bucket with a short-lived
  signed URL, then `/api/admin/upload/process` writes the variants ([media-variants.ts](../../src/lib/media-variants.ts)).
  Keys and widths are shared in [media-storage.ts](../../src/lib/media-storage.ts). OG tags and JSON-LD use the same URLs.
- **Contact enquiries.** If saving to MongoDB fails, the message is encrypted and written to R2 under
  `contact-spool/`. The nightly cron moves each one into the database and deletes the file. Replays are idempotent.
- **Backups.** [disaster-recovery.yml](../../.github/workflows/disaster-recovery.yml) runs nightly. It compares a
  fingerprint of the collections (counts and latest `updatedAt`) with the last backup, and skips the dump when nothing
  changed. A full dump is taken at least weekly, and whenever you run the workflow with `force` set. Dumps are
  encrypted with AES-256-GCM and uploaded to R2. They keep 30 days plus the first dump of each month. Each dump is named
  by its UTC time, for example `backups/mongo/2026-11-17T07-19-15Z.archive.gz.enc`.
- **Off-site copy.** A second job in [disaster-recovery.yml](../../.github/workflows/disaster-recovery.yml) runs after the
  backup. It clones the private `swati-portfolio-backups` repo and copies in the newest encrypted dump and any image
  originals it doesn't have yet ([backup-r2-to-offsite.mjs](../../scripts/backup-r2-to-offsite.mjs)). It commits and pushes only when
  something changed. Files are never removed from the repo. A failed media copy doesn't stop the database copy.
  Every changed dump and every new original adds to the repo's size, so check the size after the first run.
- **Monitoring.** [probe-media-health.mjs](../../scripts/probe-media-health.mjs) runs every 15 minutes in
  [media-health.yml](../../.github/workflows/media-health.yml). It fetches a canary image through the media domain, the
  way visitors load images, and checks the canary object in the R2 media bucket behind it. The result is saved to
  `ops/media-health.json` in the backup bucket. Alerts are emailed when the state changes. A down or critical state
  needs two failed runs in a row.

## One-time setup

1. **Create the R2 buckets** in Cloudflare, following [Image storage](./media-storage.md):
   - `swati-backups` (private): database dumps, the snapshot and the probe state.
   - `swati-media` (public, custom domain `media.<your domain>`): the WebP variants the site serves.
   - `swati-media-originals` (private): the original uploads, used to rebuild variants.
2. **Create an R2 API token** with Object Read & Write on those three buckets. Note the account ID, access key ID and secret.
3. **Generate the backup passphrase** with `openssl rand -base64 48`. Store it in a password manager. Without it,
   no backup can be decrypted.
4. **Add these GitHub Actions secrets:** `MONGODB_URI` (production), `BACKUP_ENCRYPTION_KEY`, `R2_ACCOUNT_ID`,
   `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BACKUP_BUCKET`, `R2_MEDIA_BUCKET`, `R2_ORIGINALS_BUCKET`, and
   `NEXT_PUBLIC_MEDIA_BASE_URL` (`https://media.<your domain>`). Also add `BACKUP_REPO_TOKEN`: a fine-grained GitHub
   token with Contents read and write on the private `swati-portfolio-backups` repo only. Create that repo first,
   empty and private.
5. **Add these Vercel environment variables** (Production): `NEXT_PUBLIC_MEDIA_BASE_URL`, `R2_MEDIA_BUCKET`,
   `R2_ORIGINALS_BUCKET`, `BACKUP_ENCRYPTION_KEY` (encrypts contact enquiries spooled during an outage), `R2_ACCOUNT_ID`,
   `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BACKUP_BUCKET` and `CRON_SECRET`.
   Use a random value for `CRON_SECRET`. Vercel Cron sends it automatically.
6. **Run the workflow once** from Actions → Disaster recovery → Run workflow. Check that the two buckets have objects.
7. **Build the first snapshot:**
   `curl -H "Authorization: Bearer $CRON_SECRET" https://<your-site>/api/cron/content-snapshot`.

8. **Create the health-check canary** once in each media bucket:
   `node --env-file=.env.prod scripts/ensure-media-canary.mjs`. It writes `swati-portfolio/_health/canary-w160.webp`
   to `R2_MEDIA_BUCKET` and does nothing if it already exists.
9. **Add the alert secrets for the media probe:** `RESEND_API_KEY`, `ALERT_EMAIL` (where alerts go) and optionally
   `RESEND_FROM_EMAIL`. Then run **Media health** once from Actions. The probe reuses the R2 secrets from step 4.
10. **Add two uptime monitors** in a service such as UptimeRobot or Better Stack, both checking for HTTP 200:
    `https://<your-site>/api/health/media` (503 when the media domain is down or critical, or when the probe hasn't run
    for 45 minutes) and `https://<your-site>/api/health/snapshot` (503 when the content snapshot is missing or older than
    36 hours). These monitors don't depend on the probe or on GitHub, so they can alert when either one stops.

UAT and local leave the production R2 variables blank except the restore-drill keys. Blank means no snapshot writes,
so UAT test data can't reach the production buckets. Vercel's R2 variables belong in the **Production** scope
only. Local restore drills pass the bucket on the command line, because `.env.local` leaves it blank:

```bash
R2_BACKUP_BUCKET=swati-backups node --env-file=.env.local scripts/restore-mongo-from-r2.mjs --list
```

Node doesn't overwrite variables already set in the shell, so the blank file value doesn't interfere.
The backup and media-health workflows only ever point at production.

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

To restore from the off-site copy instead, clone `swati-portfolio-backups` and pass the dump with `--from-file`. This
works without R2:

```bash
node --env-file=.env.prod scripts/restore-mongo-from-r2.mjs --from-file <backup-repo>/mongo/<dump>.archive.gz.enc \
  --target-uri "<target-uri>" --target-db swati_portfolio_restore_test --dry-run
```

`--from-file` needs `BACKUP_ENCRYPTION_KEY` but no R2 variables.

Restore drill check: once a quarter, restore into `swati_portfolio_restore_test`, run the site locally with
`MONGODB_URI` pointed at it, check the homepage and admin, then drop that database.

## Restore images

Each image has two copies in R2: the original in `swati-media-originals` and the WebP variants in `swati-media`. Both
are keyed by the `public_id` stored in MongoDB, so the database needs no changes after a restore. A third copy of the
originals is in the off-site backup repo.

To restore from the off-site copy:

1. Clone `swati-portfolio-backups`. The images are in its `images/` folder.
2. Dry run first. It lists what would be written and writes nothing:
   `node --env-file=.env.prod scripts/restore-media-from-offsite.mjs <backup-repo>/images --dry-run`
3. Run it with `--confirm`. It uploads any missing original, then builds and uploads any missing WebP variant. Existing
   objects are never overwritten, so it's safe to re-run.

Check a restored image with `curl -I https://media.<your domain>/<public_id>-w960.webp`.

## Checking health

- `/api/health/media` returns 503 when the media domain is down or critical, or when the probe hasn't run for 45 minutes.
  The body includes the last check time, the reasons and delivery latency. It reads the saved state from R2,
  so it still answers while the database is down.
- `/api/health/snapshot` returns 503 when the content snapshot is missing or more than 36 hours old.
- `/api/health/db` returns 500 when the database is down.
- To check an image directly, run `curl -I https://media.<your domain>/<public_id>-w960.webp`. Expect `200` and `image/webp`.
- Point an uptime monitor at the homepage as well.

## Fire drill

Run this after a deploy that touches image storage, and once a quarter. Use a copy of the repository, not your
usual dev server, because two dev servers in one folder fight over `.next`. Keep the copy's environment on UAT or
local values, and clear the database variables below only in the copy.

1. **Database outage.** Start a copy with an unreachable `MONGODB_URI` and the same database name, for example
   `mongodb://127.0.0.1:9/swati_portfolio?serverSelectionTimeoutMS=2000&directConnection=true`. The snapshot is keyed
   by that name, so it must match. Check `/`, `/portfolio`, an artwork page, `/contact`, and
   `/api/health/snapshot` (expect `200`). `/api/health/db` is expected to return 500.
2. **Contact enquiries during an outage.** Still with the database down, submit the contact form. Check that an object
   appears under `contact-spool/` in the backup bucket. Then call the cron route with the `CRON_SECRET` from that
   environment, and check the response's `contactSpool.replayed` count and that the message is in the admin inbox.
3. **Monitoring.** Run `node --env-file=.env.local scripts/probe-media-health.mjs --dry-run` with a bad
   `NEXT_PUBLIC_MEDIA_BASE_URL`. Expect `status: "down"` and `effectiveStatus: "healthy"`, since one failure isn't enough.
   A dry run doesn't store the count. To see the second failure flip the status and send the alert, run it twice
   without `--dry-run`. Do this only against UAT buckets, because real runs write state and can send email.
4. **Restore.** Follow [Restore the database](#restore-the-database) with `--dry-run` against the newest dump.
5. **Images.** Run the [image restore](#restore-images) with `--dry-run` against the UAT buckets. Expect every original
   and variant to be reported as present, and nothing uploaded.
