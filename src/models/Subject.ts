import { Schema, model, models } from "mongoose";

const subjectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  },
  { timestamps: true }
);

export default models.Subject || model("Subject", subjectSchema);
