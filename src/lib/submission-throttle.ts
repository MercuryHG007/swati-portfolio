import { createHash } from "node:crypto";
import { connectToDatabase } from "@/lib/mongodb";
import { SubmissionThrottle } from "@/models";

const WINDOW_MS = 10 * 60_000;
const MAX_SUBMISSIONS_PER_WINDOW = 5;

// Counts a submission against the client's hashed IP and reports whether it is still within the limit.
// The window starts at the first submission and the counter expires with the window.
export async function allowSubmission(ip: string): Promise<boolean> {
  await connectToDatabase();
  const key = createHash("sha256").update(ip).digest("hex");
  const doc = await SubmissionThrottle.findOneAndUpdate(
    { key },
    {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt: new Date(Date.now() + WINDOW_MS) },
    },
    { upsert: true, new: true, lean: true }
  );
  return (doc?.count ?? 0) <= MAX_SUBMISSIONS_PER_WINDOW;
}
