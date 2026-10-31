import { Schema, model, models } from "mongoose";

export const SERIES_SETTINGS_DEFAULTS = {
  heading: "Series",
  body: "Bodies of work, each built around a single idea.",
  ctaLabel: "View all series",
};

// Singleton document — always queried/upserted via findOne(), never listed.
const seriesSettingsSchema = new Schema(
  {
    heading: { type: String, default: SERIES_SETTINGS_DEFAULTS.heading },
    body: { type: String, default: SERIES_SETTINGS_DEFAULTS.body },
    ctaLabel: { type: String, default: SERIES_SETTINGS_DEFAULTS.ctaLabel },
  },
  { timestamps: true }
);

export default models.SeriesSettings || model("SeriesSettings", seriesSettingsSchema);
