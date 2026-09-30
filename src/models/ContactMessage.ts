import { Schema, model, models } from "mongoose";

const contactMessageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default models.ContactMessage || model("ContactMessage", contactMessageSchema);
