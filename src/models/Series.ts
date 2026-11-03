import { Schema, model, models } from "mongoose";
import { cloudinaryImageSchema, PUBLICATION_STATUS } from "./shared";

const seriesSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    coverImage: { type: cloudinaryImageSchema, default: null },
    order: { type: Number, default: 0 },
    // Curated by the admin for the portfolio carousel. Carousel order follows `order`.
    featured: { type: Boolean, default: false },
    status: { type: String, enum: PUBLICATION_STATUS, default: "hidden" },
  },
  { timestamps: true }
);

export default models.Series || model("Series", seriesSchema);
