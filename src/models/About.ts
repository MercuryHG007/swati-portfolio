import { Schema, model, models } from "mongoose";
import { cloudinaryImageSchema } from "./shared";

// Singleton document — always queried/upserted via findOne(), never listed.
const aboutSchema = new Schema(
  {
    bio: { type: String, default: "" },
    statement: { type: String, default: "" },
    photo: { type: cloudinaryImageSchema, default: null },
    resumeUrl: { type: String, default: "" },
    contactEmail: { type: String, default: "" },
    socials: {
      instagram: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

export default models.About || model("About", aboutSchema);
