import { Schema, model, models } from "mongoose";

export const STYLE_GUIDE_MAX_LENGTH = 4000;

// Singleton document — always queried/upserted via findOne(), never listed.
const artworkAssistSettingsSchema = new Schema(
  {
    // The artist's own rules for how the AI should write about her work. Sent with every suggestion.
    styleGuide: { type: String, default: "", maxlength: STYLE_GUIDE_MAX_LENGTH },
  },
  { timestamps: true }
);

export default models.ArtworkAssistSettings || model("ArtworkAssistSettings", artworkAssistSettingsSchema);
