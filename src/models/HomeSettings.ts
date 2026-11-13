import { Schema, model, models } from "mongoose";

export const HOME_SETTINGS_DEFAULTS = {
  heroHeading: "Swati Garg. Paintings exploring light, landscape and quiet moments.",
  heroButtonLabel: "View Portfolio",
  featuredLabel: "Featured work",
  mediumsLabel: "Working mediums",
  commissionsHeading: "Commissions and enquiries are welcome.",
};

// Singleton document — always queried/upserted via findOne(), never listed.
const homeSettingsSchema = new Schema(
  {
    heroHeading: { type: String, default: HOME_SETTINGS_DEFAULTS.heroHeading },
    heroButtonLabel: { type: String, default: HOME_SETTINGS_DEFAULTS.heroButtonLabel },
    featuredLabel: { type: String, default: HOME_SETTINGS_DEFAULTS.featuredLabel },
    mediumsLabel: { type: String, default: HOME_SETTINGS_DEFAULTS.mediumsLabel },
    commissionsHeading: { type: String, default: HOME_SETTINGS_DEFAULTS.commissionsHeading },
  },
  { timestamps: true }
);

export default models.HomeSettings || model("HomeSettings", homeSettingsSchema);
