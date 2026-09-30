import { Schema, model, models } from "mongoose";

const mediumSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  },
  { timestamps: true }
);

export default models.Medium || model("Medium", mediumSchema);
