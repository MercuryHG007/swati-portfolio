import { Schema, model, models } from "mongoose";

// Where the enquiry came from: the artwork it was sent from, plus first-touch campaign data.
const leadSourceSchema = new Schema(
  {
    artworkSlug: { type: String, default: "" },
    utmSource: String,
    utmMedium: String,
    utmCampaign: String,
    utmTerm: String,
    utmContent: String,
    referrer: String,
    landingPage: String,
  },
  { _id: false }
);

const contactMessageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    readAt: { type: Date, default: null },
    source: { type: leadSourceSchema, default: undefined },
  },
  { timestamps: true }
);

export default models.ContactMessage || model("ContactMessage", contactMessageSchema);
