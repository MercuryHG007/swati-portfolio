import { Schema, model, models } from "mongoose";

// The latest AI summary for each analytics period. One document per period, replaced when a new one is written.
const analyticsSummarySchema = new Schema({
  days: { type: Number, required: true, unique: true },
  summary: { type: String, required: true },
  generatedAt: { type: Date, required: true },
});

export default models.AnalyticsSummary || model("AnalyticsSummary", analyticsSummarySchema);
