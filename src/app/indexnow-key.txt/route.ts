import { indexNowKey } from "@/lib/indexnow";

// Served at the URL sent as keyLocation, so IndexNow can confirm the site owns the submitted URLs.
export function GET() {
  const key = indexNowKey();
  if (!key) return new Response("Not found", { status: 404 });
  return new Response(key, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
