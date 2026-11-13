import type { NextConfig } from "next";

// Report-only for now: violations are logged in the browser console and nothing is blocked.
// Switch to Content-Security-Policy once the console is clean across the public pages.
const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js inline bootstrap scripts and gtag's inline init need 'unsafe-inline'; nonces would require the proxy to run on every route.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com https://*.google-analytics.com https://*.googletagmanager.com",
  "font-src 'self' data:",
  // Turnstile fetches a data: URL internally, so data: is needed here or the widget logs a violation.
  "connect-src 'self' data: https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.doubleclick.net https://challenges.cloudflare.com",
  "media-src 'self' https://res.cloudinary.com",
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
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

