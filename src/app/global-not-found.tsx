import type { Metadata } from "next";
import { NotFoundContent } from "@/components/not-found-content";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { serif, sans } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Page not found — Swati Garg",
};

// For URLs that match no route. This page renders outside the (site) layout, so it repeats the same shell.
export default function GlobalNotFound() {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} h-full antialiased`}>
      <body className="site-public min-h-full flex flex-col bg-background text-foreground font-sans">
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <NotFoundContent />
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
