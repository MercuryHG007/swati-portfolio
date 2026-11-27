import type { NextConfig } from "next";

// Report-only for now: violations are logged in the browser console and nothing is blocked.
// Switch to Content-Security-Policy once the console is clean across the public pages.
// Images and media come from the public R2 media domain (NEXT_PUBLIC_MEDIA_BASE_URL).
const mediaOrigin = process.env.NEXT_PUBLIC_MEDIA_BASE_URL ? new URL(process.env.NEXT_PUBLIC_MEDIA_BASE_URL).origin : "";

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js inline bootstrap scripts and gtag's inline init need 'unsafe-inline'; nonces would require the proxy to run on every route.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  ["img-src 'self' data: blob:", mediaOrigin, "https://*.google-analytics.com https://*.googletagmanager.com"].filter(Boolean).join(" "),
  "font-src 'self' data:",
  // Turnstile fetches a data: URL internally, so data: is needed here or the widget logs a violation.
  "connect-src 'self' data: https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.doubleclick.net https://challenges.cloudflare.com",
  ["media-src 'self'", mediaOrigin].filter(Boolean).join(" "),
  "frame-src https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Unmatched URLs get the in-house 404 in app/global-not-found.tsx instead of Next's default page.
  experimental: { globalNotFound: true },
  // Next streams metadata to browsers for speed, but sends it in <head> to crawlers that need it there. Next's default
  // list misses Googlebot (no "-Google" suffix), so it is added here. The rest of the default list is kept, so social
  // preview bots still get head metadata.
  htmlLimitedBots: /Googlebot|[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight/i,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

