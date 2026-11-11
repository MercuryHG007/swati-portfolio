import type { Metadata } from "next";
import { serif, sans } from "@/lib/fonts";
import { SiteHeader } from "@/components/site-header";
import { HeaderFilterProvider } from "@/components/header-filter";
import { SiteFooter } from "@/components/site-footer";
import { ScrollToTop } from "@/components/scroll-to-top";
import { SiteAnalytics } from "@/components/analytics/site-analytics";
import { CookieConsent } from "@/components/analytics/cookie-consent";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { getSiteUrl, isIndexableDeployment } from "@/lib/seo";
import "../globals.css";

// Child pages inherit metadataBase and robots, and use relative canonical paths against it.
export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: "Swati Garg — Watercolor Artist",
  description: "Portfolio of watercolor, acrylic, pencil and oil works by Swati Garg.",
  ...(!isIndexableDeployment() && { robots: { index: false, follow: false } }),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${serif.variable} h-full antialiased`}
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className="site-public min-h-full flex flex-col bg-background text-foreground font-sans">
        <HeaderFilterProvider>
          <SiteHeader />
          <div className="flex flex-1 flex-col">{children}</div>
          <SiteFooter />
        </HeaderFilterProvider>
        <ScrollToTop />
        <SiteAnalytics />
        <CookieConsent />
        <SpeedInsights />
      </body>
    </html>
  );
}
