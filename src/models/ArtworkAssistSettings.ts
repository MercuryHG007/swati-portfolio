import { Schema, model, models } from "mongoose";

export const STYLE_GUIDE_MAX_LENGTH = 4000;
export const GEMINI_MODEL_LIST_MAX = 5;

const exhaustedModelSchema = new Schema(
  {
    model: { type: String, required: true },
    // Next midnight Pacific, when Gemini resets the daily quota for this model.
    until: { type: Date, required: true },
  },
  { _id: false }
);

// Singleton document — always queried/upserted via findOne(), never listed.
const artworkAssistSettingsSchema = new Schema(
  {
    // The artist's own rules for how the AI should write about her work. Sent with every suggestion.
    styleGuide: { type: String, default: "", maxlength: STYLE_GUIDE_MAX_LENGTH },
    // Gemini models in the order they are tried. Empty means use GEMINI_ARTWORK_MODELS or the built-in default.
    geminiModels: { type: [String], default: [] },
    // Models that returned a daily-quota error, skipped until they reset.
    exhaustedModels: { type: [exhaustedModelSchema], default: [] },
  },
  { timestamps: true }
);

export default models.ArtworkAssistSettings || model("ArtworkAssistSettings", artworkAssistSettingsSchema);
