import { Schema, model, models } from "mongoose";
import { cloudinaryImageSchema, PUBLICATION_STATUS } from "./shared";

const dimensionsSchema = new Schema(
  {
    height: Number,
    width: Number,
    unit: { type: String, enum: ["cm", "in"], default: "cm" },
  },
  { _id: false }
);

const artworkSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    images: { type: [cloudinaryImageSchema], default: [] },
    dateMade: { type: Date },
    medium: { type: Schema.Types.ObjectId, ref: "Medium", required: true },
    subjects: [{ type: Schema.Types.ObjectId, ref: "Subject" }],
    // null = standalone artwork, not part of any series
    series: { type: Schema.Types.ObjectId, ref: "Series", default: null },
    dimensions: dimensionsSchema,
    description: { type: String, default: "" },
    order: { type: Number, default: 0 },
    // Position within its series' artwork list, independent of the site-wide `order`.
    seriesOrder: { type: Number, default: 0 },
    status: { type: String, enum: PUBLICATION_STATUS, default: "hidden" },
    // Curated by the admin for the homepage "Featured work" section — not every artwork should show there.
    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default models.Artwork || model("Artwork", artworkSchema);
