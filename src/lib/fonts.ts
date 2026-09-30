import { Inter, Space_Mono } from "next/font/google";

// Free Google Fonts standing in for the (paid) Aperçu Pro / Aperçu Pro Mono reference pairing.
// Shared between the (site) and (admin) root layouts so both groups render the same typeface.
export const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const mono = Space_Mono({
  variable: "--font-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
});
