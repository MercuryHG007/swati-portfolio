# MongoDB Atlas setup

MongoDB stores artworks, series, exhibitions, the About page, contact messages, and admin logins.
The app connects through `MONGODB_URI` (`src/lib/mongodb.ts`). Without it, every page that reads
data fails, so this is the first service to set up.

## What the code expects

| Variable | Used by | Public? |
| --- | --- | --- |
| `MONGODB_URI` | `src/lib/mongodb.ts`, `src/auth.ts`, the seed and admin scripts | **No. Contains the database password.** |

The app connects with Mongoose. Connections are cached, so one connection is reused across requests.

---

## Part 1: Create a cluster

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) and sign in, or create an account.
2. Click **Create** (or **+ Create a deployment**).
3. Choose **M0** (the free tier). Pick a cloud provider and a region close to your visitors,
   for example **Mumbai (ap-south-1)** for India.
4. Name the cluster (for example `swati-portfolio`) and click **Create deployment**.

Atlas will ask you to create a database user and set network access. Those are Parts 2 and 3.

---

## Part 2: Create a database user

1. In the security quickstart (or **Database & Network Access → Database Access**), click
   **Add new database user**.
2. Authentication: **Password**.
3. Username: `swati-app`.
4. Click **Autogenerate Secure Password**, then **Copy** it somewhere safe. You'll need it for
   `MONGODB_URI`. It is shown only once.
5. Database user privileges: **Read and write to any database** is the simplest choice. If you
   want to restrict it, pick **Only specific databases** and select your database (below).
6. Click **Add user**.

---

## Part 3: Allow network access

Vercel's outgoing IP addresses change, so the simplest setup is to allow connections from anywhere:

1. **Database & Network Access → Network Access → Add IP address**.
2. Click **Allow access from anywhere**. This adds `0.0.0.0/0`.
3. Click **Confirm**.

The database is still protected by the username and password. If you want a tighter setup, use a
paid plan with static outbound IPs and list only those addresses.

---

## Part 4: Get the connection string

1. On the cluster card, click **Connect** → **Drivers**.
2. Choose **Node.js** and copy the connection string. It looks like this:

   ```
   mongodb+srv://swati-app:<password>@<cluster-host>.mongodb.net/?retryWrites=true&w=majority&appName=swati-portfolio
   ```

3. Replace `<password>` with the database user's password. If the password contains characters
   such as `@`, `:`, `/`, `?`, `#`, or `%`, percent-encode them (`@` becomes `%40`), or the URL
   will not parse.
4. **Add the database name** after the host, before the `?`. Without it, Mongoose uses a database
   named `test`:

   ```
   mongodb+srv://swati-app:PASSWORD@cluster0.xxxxx.mongodb.net/swati_portfolio?retryWrites=true&w=majority&appName=swati-portfolio
   ```

Use the database name for each environment: `swati_portfolio_prod` for production, and
`swati_portfolio` for UAT and local (see the [environment table](./README.md)). Changing a name later
points the app at a different database, which is empty unless data already exists there.

---

## Part 5: Set the variable

Add it to `.env.local` in the project root:

```bash
MONGODB_URI=mongodb+srv://swati-app:PASSWORD@cluster0.xxxxx.mongodb.net/swati_portfolio?retryWrites=true&w=majority&appName=swati-portfolio
```

Also add it in **Vercel → Project → Settings → Environment Variables**. Use `swati_portfolio_prod` for
Production and `swati_portfolio` for Preview (UAT). Redeploy afterwards.

---

## Part 6: Create the first admin login

Admin login is stored in MongoDB, so you need to create at least one admin user.

```bash
npm run create-admin -- you@example.com "a-long-random-password"
```

- The script creates the user, or resets the password if the email already exists.
- The password is stored as a bcrypt hash. It is never saved in plain text.
- Your shell history keeps the command. Clear it, or use a password manager to run the command
  without typing the password into the terminal history.

Then start the app (`npm run dev`), go to [http://localhost:3000/admin/login](http://localhost:3000/admin/login),
and sign in.

---

## Part 7: Verify

1. Open [http://localhost:3000/api/health/db](http://localhost:3000/api/health/db). Expected output:
   `{"ok":true,"readyState":1,"db":"swati_portfolio"}`. `readyState: 1` means connected, and `db`
   shows which database the app is using. Check that it matches your database name.
2. Sign in to `/admin`. The dashboard shows counts for each section.

Other scripts that write to the database (each runs with `.env.local`):

- `npm run seed-resume-content`: loads the artist's mediums, exhibitions, and CV lists. It is safe
  to run again. It upserts by slug and fills About contact fields only when they are empty.

The `/api/health/db` endpoint is public, so it shows only the status, the connection state, and the
database name. It never shows the connection string or password.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Missing MONGODB_URI environment variable` | Variable not set, or the server wasn't restarted | Check `.env.local` and restart `npm run dev`. On Vercel, redeploy |
| `bad auth: Authentication failed` | Wrong username or password, or an unencoded special character | Reset the password in Atlas and re-encode it in the string |
| `Could not connect ... IP that isn't whitelisted` | Network access doesn't include your IP or Vercel | Part 3: allow `0.0.0.0/0` |
| `querySrv ENOTFOUND` | Typo in the cluster host, or the cluster is paused | Re-copy the host from **Connect**. M0 clusters can pause after long inactivity; resume it in Atlas |
| Data appears missing after a deployment | Database name differs from the earlier one | Make sure the path after `.mongodb.net/` is the same everywhere |
| Admin login fails with the right password | The admin user was created in a different database | Run `create-admin` again with the same `MONGODB_URI` |
| Works on `localhost`, fails on Vercel | The variable isn't set in Vercel, or the project wasn't redeployed. Or Network Access doesn't allow Vercel's IPs | Set it in Vercel, redeploy, and confirm Part 3 is `0.0.0.0/0` |
| `/api/health/db` returns `readyState` 0 or 2 | Not connected yet (0), or connecting or disconnecting (2) | Wait a few seconds and reload. If it stays the same, check the cluster status in Atlas |
| Artworks or series don't show on the public site | New items default to **Hidden**. The public site only shows **Published** items | Open the item in admin and set **Status** to **Published**. Series also need a published status to get a public page |
| Local and production data look different | They're separate databases, by design, if their `MONGODB_URI` values differ | Expected. Create admins and content in each environment separately |
| `bad auth` right after changing the password in Atlas | The old password is still in `.env.local` or Vercel | Update the URI in both places, restart or redeploy |

## Questions and answers

**Can I use a local MongoDB instead of Atlas?**
Yes. Set `MONGODB_URI=mongodb://127.0.0.1:27017/swati_portfolio_dev`. Use `127.0.0.1` rather than `localhost`, because Node.js can resolve `localhost` to IPv6 and fail to connect. Atlas Network Access rules don't apply to a local database.

**Should local and production use the same database?**
Never for production. Production is `swati_portfolio_prod`, which is separate. In this setup, local
and UAT both use `swati_portfolio`, so local edits show up in UAT. To keep local work apart, set
`MONGODB_URI` in `.env.local` to a `swati_portfolio_dev` database. Then local testing can't change
UAT content.

**How do I create an admin login for production?**
`npm run create-admin` reads `.env.local`, which points at your local database. For production, put the production URI in a separate file and run the script with it:

```bash
node --env-file=.env.production.local scripts/create-admin.mjs you@example.com "a-long-random-password"
```

`.env*` files are git-ignored, so the file stays out of the repository. Delete it when you're done if you don't need it again.

**The script says "Admin user ready". Does that reset an existing password?**
Yes. It finds the user by email and sets a new password, or creates the user if none exists. Running it again is the way to reset a forgotten password.

**How do I add a second admin?**
Run `create-admin` with the second person's email. Each email is a separate login.

**Are my images stored in MongoDB?**
No. Images live in Cloudinary. MongoDB stores their Cloudinary IDs, along with titles, descriptions, and status.

**Are the database contents backed up?**
Backup options depend on your Atlas tier. Check the cluster's **Backup** tab to see what it supports. If you can't rely on it, export your content regularly.

**Why doesn't my data show on the public site?**
Check the item's status first. Artworks and series are **Hidden** by default, and the public site shows only **Published** items.

## Checklist

- [ ] M0 cluster created
- [ ] Database user created, and its password saved
- [ ] Network access allows the app's hosts
- [ ] `MONGODB_URI` includes the password (encoded) and the database name
- [ ] Same value set in Vercel, and redeployed
- [ ] `/api/health/db` returns `"ok":true`
- [ ] First admin created with `npm run create-admin`
