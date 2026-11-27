import { after } from "next/server";
import { absoluteUrl, getSiteUrl, isIndexableDeployment } from "@/lib/seo";

// IndexNow tells Bing about new, changed and removed URLs without waiting for a recrawl. The key is public by
// design: the key route serves it so the engine can confirm the site owns the submitted URLs.
export const INDEXNOW_KEY_PATH = "/indexnow-key.txt";
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const KEY_PATTERN = /^[a-zA-Z0-9-]{8,128}$/;

export function indexNowKey(): string | undefined {
  const key = process.env.INDEXNOW_KEY?.trim();
  return key && KEY_PATTERN.test(key) ? key : undefined;
}

export function indexNowPayload(absoluteUrls: string[], key: string) {
  return {
    host: getSiteUrl().host,
    key,
    keyLocation: absoluteUrl(INDEXNOW_KEY_PATH),
    urlList: absoluteUrls,
  };
}

// Called from admin actions with site paths. Submits after the response is sent and never throws, so a failed
// ping cannot fail a save. Preview and UAT deployments submit nothing, matching their noindex rules.
export function notifyIndexNow(paths: string[]) {
  const key = indexNowKey();
  if (!key || !isIndexableDeployment() || paths.length === 0) return;
  const urls = [...new Set(paths.map((path) => absoluteUrl(path)))];
  after(() => submitIndexNow(urls, key));
}

async function submitIndexNow(urls: string[], key: string) {
  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(indexNowPayload(urls, key)),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) console.error(`[indexnow] submission returned ${response.status}`);
  } catch (error) {
    console.error("[indexnow] submission failed", error);
  }
}
