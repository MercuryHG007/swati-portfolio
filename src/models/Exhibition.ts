import { Schema, model, models } from "mongoose";
import { mediaImageSchema, PUBLICATION_STATUS } from "./shared";

const exhibitionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    slugHistory: { type: [String], default: [] },
    venue: { type: String, required: true },
    city: { type: String, default: "" },
    country: { type: String, default: "" },
    type: { type: String, enum: ["solo", "group"], default: "group" },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    description: { type: String, default: "" },
    images: { type: [mediaImageSchema], default: [] },
    status: { type: String, enum: PUBLICATION_STATUS, default: "hidden" },
    artworks: [{ type: Schema.Types.ObjectId, ref: "Artwork" }],
  },
  { timestamps: true }
);

exhibitionSchema.index({ slugHistory: 1 });

export default models.Exhibition || model("Exhibition", exhibitionSchema);
