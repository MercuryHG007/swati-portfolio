import { Schema, model, models } from "mongoose";
import { PUBLICATION_STATUS } from "./shared";

const faqSchema = new Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    // Lower numbers appear first.
    order: { type: Number, default: 0 },
    status: { type: String, enum: PUBLICATION_STATUS, default: "hidden" },
  },
  { timestamps: true }
);

export default models.Faq || model("Faq", faqSchema);
