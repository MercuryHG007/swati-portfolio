import type { Metadata } from "next";
import { sans, mono } from "@/lib/fonts";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SpeedInsights } from '@vercel/speed-insights/next';
import "../globals.css";

export const metadata: Metadata = {
  title: "Swati Garg — Watercolor Artist",
  description: "Portfolio of watercolor, acrylic, pencil and oil works by Swati Garg.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
        <SpeedInsights />
      </body>
    </html>
  );
}
