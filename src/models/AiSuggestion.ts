import { Schema, model, models } from "mongoose";

const textFields = {
  title: { type: String, default: "" },
  description: { type: String, default: "" },
};

// One row per suggestion the admin received. `saved` is filled in when the artwork is saved, so the
// difference between what the AI wrote and what the artist kept can be shown back to the model later.
const aiSuggestionSchema = new Schema(
  {
    artwork: { type: Schema.Types.ObjectId, ref: "Artwork", default: null },
    suggested: { type: new Schema({ ...textFields, altText: { type: String, default: "" } }, { _id: false }), required: true },
    saved: { type: new Schema(textFields, { _id: false }), default: null },
  },
  { timestamps: true }
);

export default models.AiSuggestion || model("AiSuggestion", aiSuggestionSchema);
