import { Suspense } from "react";
import type { Metadata } from "next";
import { serif, sans } from "@/lib/fonts";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ScrollToTop } from "@/components/scroll-to-top";
import { NavigationLockRelease } from "@/components/navigation-lock-release";
import { SiteAnalytics } from "@/components/analytics/site-analytics";
import { CookieConsent } from "@/components/analytics/cookie-consent";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { getSiteUrl, isIndexableDeployment } from "@/lib/seo";
import { getSiteCopy } from "@/lib/site-copy";
import "../globals.css";

// Child pages inherit metadataBase and robots, and use relative canonical paths against it.
export async function generateMetadata(): Promise<Metadata> {
  const copy = await getSiteCopy();
  return {
    metadataBase: getSiteUrl(),
    title: copy.title,
    description: copy.description,
    ...(!isIndexableDeployment() && { robots: { index: false, follow: false } }),
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${serif.variable} h-full antialiased`}
    >
      <body className="site-public min-h-full flex flex-col bg-background text-foreground font-sans">
        <Suspense fallback={null}>
          <NavigationLockRelease />
        </Suspense>
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
        <ScrollToTop />
        <SiteAnalytics />
        <CookieConsent />
        <SpeedInsights />
      </body>
    </html>
  );
}
