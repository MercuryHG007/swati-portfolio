import type { MetadataRoute } from "next";
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

export default function robots(): MetadataRoute.Robots {
  if (!isIndexableDeployment()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: [
      { userAgent: AI_TRAINING_CRAWLERS, disallow: "/" },
      // Assets under /_next stay crawlable so search engines can render pages.
      { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
