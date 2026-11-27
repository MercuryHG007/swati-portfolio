import type { Metadata } from "next";
import { NotFoundContent } from "@/components/not-found-content";

export const metadata: Metadata = {
  title: "Page not found — Swati Garg",
};

// Used when a public page calls notFound(), for example a missing artwork or series.
export default function SiteNotFound() {
  return <NotFoundContent />;
}
