# Google Analytics 4 (GA4) setup

This guide sets up GA4 for the site, from scratch. It covers:

1. **Website tracking**: page views and events in GA4 (`NEXT_PUBLIC_GA_MEASUREMENT_ID`).
2. **Admin analytics page**: `/admin/analytics` reads reports from GA4 through a service account
   (`GA4_PROPERTY_ID`, `GA4_CLIENT_EMAIL`, `GA4_PRIVATE_KEY`).
3. **Lead source**: contact messages record the artwork and UTM campaign they came from. This needs
   no GA4 setup beyond tracking (1).

Google changes its console layout from time to time. The menu names below match the console as of
November 2026. If a name differs, search for the setting name in the GA console.

---

## What the code expects

| Variable | Where it's used | Public? |
| --- | --- | --- |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Loads gtag on the public site (`src/components/analytics/site-analytics.tsx`) | Yes |
| `GA4_PROPERTY_ID` | Numeric property ID for the Data API (`src/lib/ga4.ts`) | No |
| `GA4_CLIENT_EMAIL` | Service account email (`src/lib/ga4.ts`) | No |
| `GA4_PRIVATE_KEY` | Service account private key, used to sign the sign-in request (`src/lib/ga4.ts`) | **No. Secret.** |

Tracking is skipped on `/admin` and for bots. Admin pages never load gtag.

Events the site sends (check these in GA4 after setup):

- `page_view`: every page, including client-side navigation.
- `view_item`: an artwork page is opened.
- `contact_click`: the Instagram button on the contact page is clicked.
- `generate_lead`: a contact message is sent successfully.

---

## Part 1: Create the GA4 property and web stream

Do this once. It gives you the **Measurement ID**.

1. Open [analytics.google.com](https://analytics.google.com) and sign in with the Google account
   that should own the analytics.
2. Click **Admin** (gear icon, bottom left).
3. In the **Account** column, choose **Create account** if you don't have one. Otherwise pick it.
4. In the **Property** column, click **Create property**.
   - Property name: `swatigargportfolio` (or any name you'll recognise).
   - Reporting time zone: **India**. Currency: **Indian Rupee (INR)**.
   - Complete the business questions. Choose the options that match the site.
5. Choose **Web** as the platform.
6. Enter the **Website URL**:
   - Use the dropdown for the scheme (`https://`) and type only the host in the text box, for
     example `swatigargportfolio.vercel.app`. Entering `https://` in both places causes a
     "Valid website URL is required" error.
   - Stream name: `swatigargportfolio PROD`.
7. Click **Create and continue**.
8. On the stream details page, copy the **Measurement ID** (starts with `G-`). This is the value
   for `NEXT_PUBLIC_GA_MEASUREMENT_ID`.

### Turn off duplicate page-view tracking

The site already sends a `page_view` on every client-side navigation. GA4's automatic
browser-history tracking would count those again.

1. On the stream details page, click the **gear icon** next to **Enhanced measurement**.
2. Turn off **Page changes based on browser history events**.
3. Leave the other toggles on. (Page views, scrolls, and outbound clicks are fine.)

---

## Part 2: Create the service account (for the admin analytics page)

Skip this part if you only want website tracking. Do it in the **Google Cloud console**, which is a
different product from GA.

1. Open [console.cloud.google.com](https://console.cloud.google.com).
2. In the project picker at the top, select an existing project or click **New project**
   (for example `swati-portfolio`). Use the same project for every step below.
3. Enable the API:
   - Menu → **APIs & Services** → **Library**.
   - Search for **Google Analytics Data API** → open it → **Enable**.
4. Create the service account:
   - Menu → **IAM & Admin** → **Service accounts** → **+ Create service account**.
   - Name: `swati-ga4-reader`. Click **Create and continue**.
   - Skip the "Grant this service account access to project" step. It needs no project roles.
   - Click **Done**.
5. Copy the service account's **Email**. It looks like
   `swati-ga4-reader@<project-id>.iam.gserviceaccount.com`. This is `GA4_CLIENT_EMAIL`.
6. Create the key:
   - Click the service account → **Keys** tab → **Add key** → **Create new key** → **JSON** →
     **Create**.
   - A `.json` file downloads. Treat it like a password.

The JSON file contains these fields. You need `client_email` and `private_key`:

```json
{
  "type": "service_account",
  "project_id": "...",
  "client_email": "swati-ga4-reader@....iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  ...
}
```

Once the values are in `.env.local` (Part 4), delete the downloaded file. Don't store it in the
repository, in Downloads, or in cloud sync folders.

---

## Part 3: Give the service account read access to the GA4 property

Without this step, the admin page shows a 403 error.

1. Go to [analytics.google.com](https://analytics.google.com), and select the property
   **swatigargportfolio** in the property picker at the top left. Admin shows property settings
   only when a property is selected.
2. Click **Admin**.
3. In the **Property** column (middle column), click **Property access management**.
   - It is not in the Account column, and it is not in the Google Cloud console.
   - You need the **Administrator** role on the property to see it.
4. Click **+** (top right) → **Add users**.
5. Enter the service account email from Part 2, step 5.
6. Set the role to **Viewer**.
7. Click **Add**.

The Property ID is shown in **Admin → Property column → Property details**. Copy the **numeric**
value (for example `123456789`), not the `G-` Measurement ID. This is `GA4_PROPERTY_ID`.

---

## Part 4: Put the values in `.env.local`

Edit `.env.local` in the project root. The file is git-ignored. Copy from
[`.env.local.example`](../../.env.local.example) if the file doesn't exist.

```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
GA4_PROPERTY_ID=123456789
GA4_CLIENT_EMAIL=swati-ga4-reader@your-project-id.iam.gserviceaccount.com
GA4_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nPASTE_THE_REST_OF_THE_KEY_ON_ONE_LINE\n-----END PRIVATE KEY-----\n"
```

Formatting rules for `GA4_PRIVATE_KEY`:

- Put the whole value in **double quotes**, on **one line**.
- The line breaks in the key are written as the two characters `\n`. Copy the `private_key` value
  from the JSON file exactly as it appears there; it already contains `\n`.
- Keep the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines.
- Don't add spaces or extra quotes inside the value.

Then restart the dev server, because Next reads `.env.local` only at startup:

```bash
npm run dev
```

---

## Part 5: Add the same values to Vercel (production)

Local `.env.local` values are not uploaded to Vercel.

1. Open the project in [vercel.com](https://vercel.com) → **Settings** → **Environment Variables**.
2. Add each of the four variables above. Set **Environment** to **Production** (and **Preview** if
   you want previews to track too).
3. For `GA4_PRIVATE_KEY`, paste the same one-line quoted value.
4. Redeploy. `NEXT_PUBLIC_GA_MEASUREMENT_ID` is built into the JavaScript, so changing it has no
   effect until a new deployment is built.

---

## Part 6: Verify

### Website tracking

1. Open the site in a normal browser window, and make sure no ad blocker is blocking
   `googletagmanager.com`.
2. In GA4, go to **Reports → Realtime**. You should see yourself as an active user within about
   30 seconds.
3. Open an artwork page. The **Event count by event name** card should show `view_item`.
4. Submit the contact form (use a test message). The card should show `generate_lead`.
5. Click through two pages. Each click should show a `page_view` for the new path.

If nothing appears:

- Confirm `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set, then restart the dev server (locally) or redeploy
  (Vercel). Without it, no tracking code is loaded.
- Make sure you are not on the `/admin` route. Admin pages never load tracking.

### Admin analytics page

1. Start the app, sign in at `/admin/login`, and open **Analytics** in the admin navigation.
2. You should see active users, sessions, page views, top pages, and event counts.
3. A brand-new property can take 24 to 48 hours before standard reports show data. The page
   should still load without errors.

If the page shows an error, match the message to the table below.

| Message on `/admin/analytics` | Cause | Fix |
| --- | --- | --- |
| "Google Analytics is not connected" | One of `GA4_PROPERTY_ID`, `GA4_CLIENT_EMAIL`, or `GA4_PRIVATE_KEY` is missing or empty in the running environment | Check `.env.local` (locally) or Vercel variables (production), then restart or redeploy |
| "Google sign-in failed (HTTP 400)" | Wrong email, or the private key is malformed | Re-copy `client_email` and `private_key` from the JSON. Keep the quotes and `\n` escapes |
| "report failed (HTTP 403)" | The service account lacks Viewer access, or the Data API isn't enabled | Repeat Part 3, and check that the API is enabled (Part 2, step 3) |
| "report failed (HTTP 404)" | `GA4_PROPERTY_ID` is the `G-` ID instead of the numeric ID | Use the numeric Property ID from Property details |
| "Analytics could not be loaded" | Other Google-side failure | Check the server log for `GA4 overview failed` |

---

## Common issues

Errors on `/admin/analytics` are listed in Part 6. These cover the rest.

| Symptom | Cause | Fix |
| --- | --- | --- |
| Realtime shows nothing | `NEXT_PUBLIC_GA_MEASUREMENT_ID` is not set in the running environment. Or an ad blocker or privacy extension blocks `googletagmanager.com`. Or the page is `/admin`, which is never tracked | Check the variable, restart the dev server (or redeploy), then test in a private window with extensions off |
| Realtime shows your own visits from `localhost` | `.env.local` has the production Measurement ID | Expected if the ID is set locally. Leave it blank locally, or use a separate dev stream |
| Two `page_view` events per navigation | "Page changes based on browser history events" is still on | Turn it off (Part 1) |
| Events appear in Realtime but not in the standard reports | Standard reports can lag by 24 to 48 hours | Wait. Realtime is the reliable check during setup |
| `generate_lead` counts more than real enquiries | Refreshing `/contact?sent=1` fires it again, and so do bot submissions caught by the honeypot (they also redirect to `sent=1`) | Known gap, not yet fixed in the code |
| Admin page says "not connected" after you set the variables | The server wasn't restarted, or Vercel wasn't redeployed | Restart `npm run dev`, or redeploy |
| Admin page shows zeros or empty tables | New property with no data yet, or no traffic in the last 28 days | Wait, and check Realtime to confirm events arrive |
| Admin numbers differ from the GA4 interface | GA4's interface uses the date range you select, and the admin page always uses the last 28 days up to today | Compare the same date range |
| Changed `GA4_PRIVATE_KEY` but the admin page still fails | The app caches the access token in memory for about an hour, per server process | Restart the dev server, or redeploy |

## Questions and answers

**Where is the Measurement ID?**
Admin → Data streams → click your web stream. The stream details page shows **Measurement ID**, which starts with `G-`.

**"Valid website URL is required" appears when I create the stream. Why?**
The scheme is already chosen in the dropdown next to the field. Type only the host (`swatigargportfolio.vercel.app`) in the text box.

**I can't find "Property access management".**
It's in Admin, in the **Property** column (the middle column), when the correct property is selected at the top left. It is not in the Google Cloud console, and it is not **Account access management** in the Account column. You need the **Administrator** role on the property to see it. If it's still missing, check which property is selected, then ask the owner to check your role.

**What is the service account email?**
It's the `client_email` field in the JSON key. You can also copy it from Google Cloud → **IAM & Admin → Service accounts**, in the **Email** column. It looks like `swati-ga4-reader@<project-id>.iam.gserviceaccount.com`. It's not your Gmail address.

**Where do I find `GA4_PRIVATE_KEY`?**
In the JSON key file you downloaded, copy the `private_key` value. It starts with `-----BEGIN PRIVATE KEY-----`. Put the whole value in `.env.local` in double quotes, on one line (Part 4). Then delete the JSON file.

**Should I turn the `\n` sequences into real line breaks?**
No. Keep the two-character `\n` sequences on one line. The app handles both forms, but one line is less error-prone in `.env.local` and in the Vercel dashboard.

**Which ID goes in `GA4_PROPERTY_ID`?**
The numeric **Property ID** from Admin → Property column → **Property details** (for example `123456789`). It is not the `G-` Measurement ID.

**Does the service account need roles in Google Cloud?**
No. It needs only **Viewer** on the GA4 property (Part 3). The Google Cloud project is used only to enable the API and create the key.

**Can I delete the JSON file?**
Yes, once the values are in `.env.local` and Vercel. Deleting the local file doesn't revoke the key. To revoke it, delete the key under the service account's **Keys** tab.

**Will my own testing show up in reports?**
Yes, unless you leave `NEXT_PUBLIC_GA_MEASUREMENT_ID` blank locally. The site has no internal-traffic filter yet (see Notes).

**Do I need a cookie or consent banner?**
Yes if you have EU or UK visitors. The site shows a banner with Google Consent Mode v2. GA4 sets no cookies and attribution is not captured until the visitor accepts. See the consent note under Notes below.

## Notes

- **Your own visits are counted.** The site has no internal-traffic filter yet. To keep your
  testing out of reports, use the Realtime report only for checks, or create a separate test
  property for development.
- **Consent**: the public site shows a cookie banner (`src/components/analytics/cookie-consent.tsx`)
  that uses Google Consent Mode v2. The default is `denied`, so GA4 sets no cookies until the visitor
  accepts. Rejecting stops attribution capture. The banner text is generic and does not name GA4;
  the purpose is described on the privacy page. Visitors can reopen the banner from the privacy page.
- **Key rotation**: a service account key does not expire by default. If you rotate it, create a new
  key, update `GA4_PRIVATE_KEY` locally and on Vercel, redeploy, then delete the old key under the
  service account's **Keys** tab.
- **Custom dimensions**: `view_item` and `generate_lead` carry parameters such as `item_name` and
  `lead_source`. These appear in standard GA4 reports only after you register them under
  **Admin → Custom definitions**. The admin page doesn't need this.
- **Never commit** `.env.local` or the JSON key file. `.env.local` is in `.gitignore`. If a key is
  ever exposed, delete it in Google Cloud right away and create a new one.

## Checklist

- [ ] GA4 property and web stream created; Measurement ID copied
- [ ] Enhanced measurement "Page changes based on browser history events" turned off
- [ ] Google Analytics Data API enabled in the Google Cloud project
- [ ] Service account created, and JSON key downloaded
- [ ] Service account given **Viewer** on the GA4 property
- [ ] `.env.local` contains the four GA4 variables
- [ ] Same variables set in Vercel, and the project redeployed
- [ ] Realtime shows page views and `view_item` / `generate_lead`
- [ ] JSON key file deleted from the computer
