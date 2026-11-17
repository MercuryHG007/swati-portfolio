# Disaster recovery

What keeps the site up when MongoDB or Cloudinary fails, and how to restore after data loss.

## What happens in each failure

| Failure | What visitors see | What you do |
| --- | --- | --- |
| **MongoDB unreachable** | Public pages are served from the content snapshot, read-only. Contact enquiries still reach your inbox by email. Admin is unavailable. The `/portfolio` listing shows an error (see limits). | Check Atlas status. Nothing else is needed. |
| **MongoDB emptied or wiped, still reachable** | If the database has no published artworks at all, reads are served from the snapshot, so pages keep their content. A single unpublished piece is not affected. The snapshot job refuses to overwrite a snapshot that has artworks with an empty one. | [Restore the database](#restore-the-database). |
| **Cloudinary down** | Images that fail to load are served as resized copies from the R2 mirror. They show, but can take a moment longer on first load. | Nothing. |
| **Cloudinary account lost** | Same as above, and the mirror still holds every image. | [Restore images](#restore-images). |
| **Deploy during an outage** | The build prerenders some pages, so it can fail. The last deployment keeps serving. | Wait for the database, or roll back in Vercel. |

## Limits

- **Snapshot freshness.** The snapshot is rebuilt after every admin save and daily at 20:30 UTC.
  Changes made directly in MongoDB aren't captured until the next rebuild.
- **Portfolio listings aren't covered.** `/portfolio`, its filtered and paginated results, and the
  `/api/portfolio/*` routes read live data, so they error during a database outage. Single-series, artwork,
  exhibition, about, FAQ, sitemap and llms.txt pages are covered.
- **Mirror lag.** Images uploaded through admin are copied to R2 immediately. Images that existed before the mirror
  job first ran are copied by the nightly job.
- **Social preview images** (Open Graph) still point at Cloudinary.
- **Admin, messages and analytics** need the database.
- **Not a full backup.** The snapshot holds only what public pages show. The nightly dump is the full backup.

## How it works

- **Read fallback.** Public read queries in [queries.ts](../../src/lib/queries.ts) are wrapped by
  [resilient-read.ts](../../src/lib/resilient-read.ts). They try MongoDB first. After a failure the
  wrapper serves the snapshot and skips MongoDB for 60 seconds. Connection timeouts are 5 seconds
  ([mongodb.ts](../../src/lib/mongodb.ts)).
- **Snapshot.** [content-snapshot.ts](../../src/lib/content-snapshot.ts) runs every wrapped query with the arguments
  the site uses and stores the results in R2 at `content/<database name>/snapshot.json`. Each admin save schedules a
  rebuild after the response, and [a daily Vercel cron](../../vercel.json) rebuilds it too.
- **Image fallback.** [cloudinary-image.tsx](../../src/components/cloudinary-image.tsx) swaps to
  `/api/media`, which resizes the copy in the R2 mirror to the size on the page and caches it at the CDN.
  Output is WebP by default. Cloudinary's crop is matched with `object-fit: cover`.
- **Backups.** [disaster-recovery.yml](../../.github/workflows/disaster-recovery.yml) runs nightly. It dumps the
  database with `mongodump`, encrypts it with AES-256-GCM, uploads it to R2 and keeps 30 days of dumps plus the
  first dump of each month. Each dump is named by its UTC time, for example
  `backups/mongo/2026-11-17T07-19-15Z.archive.gz.enc`, so several runs on one day don't overwrite each other.
  The same workflow copies new Cloudinary images to the mirror.

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
5. **Add these Vercel environment variables** (Production): `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
   `R2_SECRET_ACCESS_KEY`, `R2_BACKUP_BUCKET`, `R2_MIRROR_BUCKET` and `CRON_SECRET`.
   Use a random value for `CRON_SECRET`. Vercel Cron sends it automatically.
6. **Run the workflow once** from Actions → Disaster recovery → Run workflow. Check that the two buckets have objects.
7. **Build the first snapshot:**
   `curl -H "Authorization: Bearer $CRON_SECRET" https://<your-site>/api/cron/content-snapshot`.

UAT and local leave every R2 variable blank except the restore-drill keys. Blank means no snapshot writes and no mirror
copies, so UAT test data can't reach the production buckets. Vercel's R2 variables belong in the **Production** scope
only. Local restore drills pass the bucket on the command line, because `.env.local` leaves it blank:

```bash
R2_BACKUP_BUCKET=swati-backups node --env-file=.env.local scripts/restore-mongo-from-r2.mjs --list
```

Node doesn't overwrite variables already set in the shell, so the blank file value doesn't interfere.
The backup and mirror workflow only ever points at production.

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
  --target-db swati_portfolio_prod --overwrite-source --confirm
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

- `/api/health/db` and `/api/health/cloudinary` return 500 when a dependency is down. Point an uptime monitor at them
  and at the homepage.
