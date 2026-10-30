import { Schema, model, models } from "mongoose";
import { cloudinaryImageSchema } from "./shared";

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
    location: { type: String, default: "" },
    photo: { type: cloudinaryImageSchema, default: null },
    resumeUrl: { type: String, default: "" },
    contactEmail: { type: String, default: "" },
    socials: {
      instagram: { type: String, default: "" },
    },
    education: { type: [cvEntrySchema], default: [] },
    awards: { type: [cvEntrySchema], default: [] },
    achievements: { type: [cvEntrySchema], default: [] },
    publicCollections: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default models.About || model("About", aboutSchema);
