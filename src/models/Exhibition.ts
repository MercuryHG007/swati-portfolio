import { Schema, model, models } from "mongoose";
import { cloudinaryImageSchema, PUBLICATION_STATUS } from "./shared";

const exhibitionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    venue: { type: String, required: true },
    city: { type: String, default: "" },
    country: { type: String, default: "" },
    type: { type: String, enum: ["solo", "group"], default: "group" },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    description: { type: String, default: "" },
    images: { type: [cloudinaryImageSchema], default: [] },
    status: { type: String, enum: PUBLICATION_STATUS, default: "hidden" },
    artworks: [{ type: Schema.Types.ObjectId, ref: "Artwork" }],
  },
  { timestamps: true }
);

export default models.Exhibition || model("Exhibition", exhibitionSchema);
