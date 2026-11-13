import { Schema, model, models } from "mongoose";

// Short-lived counters for abuse limits. Keys are hashed client identifiers, never raw IP addresses.
// Mongo removes expired rows through the TTL index, so no cleanup job is needed.
const submissionThrottleSchema = new Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});

submissionThrottleSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default models.SubmissionThrottle || model("SubmissionThrottle", submissionThrottleSchema);
