import { Schema, model, models } from "mongoose";

const adminUserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    // Bumped on password change so other devices' JWTs fail re-validation (see src/auth.ts).
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default models.AdminUser || model("AdminUser", adminUserSchema);
