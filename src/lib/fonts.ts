import { Source_Serif_4, Space_Grotesk } from "next/font/google";

// Free Google Font standing in for the (paid) MGT Fugiat used on the reference site.
// Shared between the (site) and (admin) root layouts so both groups render the same typeface.
export const sans = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Display face for headings on the public site only (see `.site-public` in globals.css).
export const serif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
});
