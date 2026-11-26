import { Schema, model, models } from "mongoose";
import { mediaImageSchema } from "./shared";

export const ABOUT_TAGLINE_DEFAULT = "Watercolor & mixed media artist";

// One CV line. `date` is free text because CV dates mix years, months and ranges ("2019 – 2020", "05/2025").
const cvEntrySchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    detail: { type: String, default: "", trim: true },
    date: { type: String, default: "", trim: true },
  },
  { _id: false }
);

// Singleton document — always queried/upserted via findOne(), never listed.
const aboutSchema = new Schema(
  {
    bio: { type: String, default: "" },
    statement: { type: String, default: "" },
    tagline: { type: String, default: ABOUT_TAGLINE_DEFAULT },
    location: { type: String, default: "" },
    photo: { type: mediaImageSchema, default: null },
    // Square mark shown in the site footer. Null hides it.
    footerLogo: { type: mediaImageSchema, default: null },
    resumeUrl: { type: String, default: "" },
    contactEmail: { type: String, default: "" },
    socials: {
      instagram: { type: String, default: "" },
      facebook: { type: String, default: "" },
      linkedin: { type: String, default: "" },
      youtube: { type: String, default: "" },
    },
    education: { type: [cvEntrySchema], default: [] },
    awards: { type: [cvEntrySchema], default: [] },
    achievements: { type: [cvEntrySchema], default: [] },
    publicCollections: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default models.About || model("About", aboutSchema);
