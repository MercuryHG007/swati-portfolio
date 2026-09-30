"use client";

// next-cloudinary@6.19.3's dist bundle is missing the "use client" directive
// (its CldImage uses useState internally), which breaks it when imported
// straight into a Server Component. Re-exporting through this client module
// gives it a proper client boundary.
export { CldImage } from "next-cloudinary";
