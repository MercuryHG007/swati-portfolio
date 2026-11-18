import { absoluteUrl, isIndexableDeployment } from "@/lib/seo";

// Crawlers that gather content for AI model training. Search indexing uses separate user agents and stays allowed.
// Compliance is voluntary, so this only signals the site's preference.
const AI_TRAINING_CRAWLERS = [
  "GPTBot",
  "ClaudeBot",
  "anthropic-ai",
  "CCBot",
  "Google-Extended",
  "Applebot-Extended",
  "Meta-ExternalAgent",
  "Bytespider",
  "Amazonbot",
  "cohere-ai",
];

// Content Signals: no AI training, search indexing allowed, and AI assistants may read pages to answer questions.
const CONTENT_SIGNAL = "ai-train=no, search=yes, ai-input=yes";
const NOT_INDEXABLE_CONTENT_SIGNAL = "ai-train=no, search=no, ai-input=no";

export function GET() {
  const lines = isIndexableDeployment()
    ? [
        ...AI_TRAINING_CRAWLERS.map((agent) => `User-agent: ${agent}`),
        "Disallow: /",
        "",
        "User-agent: *",
        "Allow: /",
        "Disallow: /admin",
        "Disallow: /api/",
        `Content-Signal: ${CONTENT_SIGNAL}`,
        "",
        `Sitemap: ${absoluteUrl("/sitemap.xml")}`,
      ]
    : ["User-agent: *", "Disallow: /", `Content-Signal: ${NOT_INDEXABLE_CONTENT_SIGNAL}`];

  return new Response(`${lines.join("\n")}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
