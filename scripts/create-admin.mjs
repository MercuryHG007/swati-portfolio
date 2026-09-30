// One-off admin user seeder. Run with:
//   node --env-file=.env.local scripts/create-admin.mjs <email> <password>
import mongoose from "mongoose";
import { hash } from "bcryptjs";

const [, , email, password] = process.argv;

if (!email || !password) {
  console.error("Usage: node --env-file=.env.local scripts/create-admin.mjs <email> <password>");
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI (did you forget --env-file=.env.local?)");
  process.exit(1);
}

// Schema duplicated (not imported) so this script has no dependency on TS path aliases.
const adminUserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);
const AdminUser = mongoose.models.AdminUser || mongoose.model("AdminUser", adminUserSchema);

await mongoose.connect(MONGODB_URI);

const passwordHash = await hash(password, 12);
const user = await AdminUser.findOneAndUpdate(
  { email: email.toLowerCase().trim() },
  { $set: { passwordHash } },
  { upsert: true, returnDocument: "after" }
);

console.log(`Admin user ready: ${user.email}`);
await mongoose.disconnect();
