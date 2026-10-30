import { Space_Grotesk } from "next/font/google";

// Free Google Font standing in for the (paid) MGT Fugiat used on the reference site.
// Shared between the (site) and (admin) root layouts so both groups render the same typeface.
export const sans = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
});
