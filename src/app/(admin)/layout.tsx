import type { Metadata } from "next";
import { Toaster } from "sonner";
import { sans, mono } from "@/lib/fonts";
import { AdminNav } from "@/components/admin/admin-nav";
import { SpeedInsights } from '@vercel/speed-insights/next';
import "../globals.css";

export const metadata: Metadata = {
  title: "Admin — Swati Garg",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <AdminNav />
        <div className="flex flex-1 flex-col">{children}</div>
        <SpeedInsights />
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
