import { Schema } from "mongoose";

// Embedded (not a separate collection) — one entry per uploaded Cloudinary asset.
export const cloudinaryImageSchema = new Schema(
  {
    publicId: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    alt: { type: String, default: "" },
  },
  { _id: false }
);

export const PUBLICATION_STATUS = ["published", "hidden"] as const;
export type PublicationStatus = (typeof PUBLICATION_STATUS)[number];

// Unset (null) means not yet recorded; the site then invites visitors to ask about availability.
export const AVAILABILITY_STATUS = ["available", "sold"] as const;
export type AvailabilityStatus = (typeof AVAILABILITY_STATUS)[number];
