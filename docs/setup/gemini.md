# Gemini setup

Gemini powers the **AI artwork assistant** on the admin artwork form. The "Suggest details with AI"
button reads the first uploaded image and proposes a title, description, SEO description, alt text,
medium and subjects. The admin reviews everything before saving.

The feature is optional. Without a key, the button shows "The AI assistant is not configured" and
the rest of the admin works as normal.

## What the code expects

| Variable | Used by | Public? |
| --- | --- | --- |
| `GEMINI_API_KEY` | `src/app/api/admin/artwork-assist/route.ts` (via `src/lib/artwork-assist.ts`) | **No. Secret.** |
| `GEMINI_ARTWORK_MODELS` | Same route. Optional, comma-separated, tried in order | No |
| `CLOUDINARY_CLOUD_NAME` | Same route, to fetch the image. Already required by [Cloudinary](./cloudinary.md) | No |

Notes:

- The route requires an admin session. Only signed-in admins can call it.
- The key is sent in the `x-goog-api-key` header on the server. It never reaches the browser, so
  do not add a `NEXT_PUBLIC_` prefix.
- When `GEMINI_ARTWORK_MODELS` is blank, the app uses `gemini-3.7-flash` and then
  `gemini-3.1-flash-lite`.

---

## Part 1: Create a key in AI Studio

Use **Google AI Studio**, not the Google Cloud console. A key made in AI Studio works without a
service account, and it can use the free tier.

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey) and sign in.
2. Click **Create API key**.
3. Choose **Create API key in new project**. This project has no billing, so it uses the free tier.
4. Copy the key. It starts with `AIza` (or `AQ.` for some newer keys). Store it somewhere safe, such as your
   password manager. You can view it again later in AI Studio.

> **Avoid keys created in an existing Google Cloud project with prepaid billing.** Google returns
> HTTP 402 ("prepayment credits are depleted") for every Gemini call from that project, even when
> the Google Cloud trial credit is available. The Google Cloud console also asks you to bind a
> Gemini key to a service account. The app doesn't need that, so an AI Studio key is simpler.

## Part 2: Restrict the key (optional)

Restricting the key to the Gemini API limits what it can do if it leaks.

1. In [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials),
   open the key.
2. Under **API restrictions**, choose **Restrict key** and select **Generative Language API**.
3. Keep **Application restrictions** on **None**. The key is called from the server, not from a
   browser, so an HTTP-referrer restriction would block it.

## Part 3: Set the variables

Add them to `.env.local`:

```bash
GEMINI_API_KEY=your-key
# Optional. Try the model that responds most reliably first.
GEMINI_ARTWORK_MODELS=gemini-3.1-flash-lite,gemini-3.7-flash
```

Restart `npm run dev` after editing `.env.local`. The app reads environment variables only at startup.

For production, add `GEMINI_API_KEY` (and `GEMINI_ARTWORK_MODELS` if you set it) in Vercel under
**Settings → Environment Variables**, then redeploy.

---

## Part 4: Test it

1. Sign in to `/admin`, then open **Artworks → New artwork**.
2. Upload an image and wait for the upload to finish.
3. Click **Suggest details with AI**.

A success message says which fields were filled. Review them before saving, because the model can
be wrong.

If it fails, the terminal running `npm run dev` shows a line such as
`Artwork assistant failed: No model produced a suggestion: gemini-3.7-flash returned HTTP 503`.
The HTTP code is the most useful clue:

| Terminal shows | Meaning | What to do |
| --- | --- | --- |
| `HTTP 402` | Prepaid credit is empty, or the key's project is billed and has no balance | Use an AI Studio key from a new project (Part 1), or top up billing |
| `HTTP 400` or `HTTP 403` | Key is invalid, revoked, or restricted away from Gemini | Check the key was copied in full. Check Part 2's restrictions |
| `HTTP 404` | The model name isn't available to your key (older names are retired) | Remove the model from `GEMINI_ARTWORK_MODELS`, or use `gemini-3.1-flash-lite` |
| `HTTP 429` | Rate or quota limit reached | Wait a minute and try again |
| `HTTP 503` | Google reports high demand. This is temporary | Try again later, or put a second model first in `GEMINI_ARTWORK_MODELS` |
| `Cloudinary returned HTTP …` | The image couldn't be fetched | See [Cloudinary](./cloudinary.md) |

The toast shows only a general message. The terminal has the detail.

---

## Free tier and data

The free tier has low limits, and the models available to it change over time. Google's free-tier
terms allow it to use the content you send, including artwork images, to improve its products.
Use a free key for testing only. Before the assistant handles real artwork you care about, move to a
billed project, where that data use doesn't apply.

For a quick check that a key works, list the models it can use. This prints only the HTTP status:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "x-goog-api-key: $GEMINI_API_KEY" \
  "https://generativelanguage.googleapis.com/v1beta/models"
```

`200` means the key works. Anything else means the key or its project needs attention.
