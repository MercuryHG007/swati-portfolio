import { Schema, model, models } from "mongoose";
import { mediaImageSchema, PUBLICATION_STATUS } from "./shared";

const seriesSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    slugHistory: { type: [String], default: [] },
    description: { type: String, default: "" },
    coverImage: { type: mediaImageSchema, default: null },
    order: { type: Number, default: 0 },
    // Curated by the admin for the portfolio carousel. Carousel order follows `order`.
    featured: { type: Boolean, default: false },
    status: { type: String, enum: PUBLICATION_STATUS, default: "hidden" },
  },
  { timestamps: true }
);

seriesSchema.index({ slugHistory: 1 });

export default models.Series || model("Series", seriesSchema);
