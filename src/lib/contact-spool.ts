import { createHash, randomUUID } from "node:crypto";
import { Types } from "mongoose";
import { decryptWithPassphrase, encryptWithPassphrase } from "@/lib/backup-crypto";
import { connectToDatabase } from "@/lib/mongodb";
import { deleteR2Object, getR2Object, listR2Objects, putR2Object, R2_BACKUP_BUCKET } from "@/lib/r2";
import { ContactMessage } from "@/models";

// Contact messages that could not be saved to the database are kept here, encrypted, until the next replay.
export const CONTACT_SPOOL_PREFIX = "contact-spool/";

export type SpooledContactMessage = {
  name: string;
  email: string;
  message: string;
  source?: Record<string, string | undefined>;
  createdAt: string;
};

function requireBucket() {
  if (!R2_BACKUP_BUCKET) throw new Error("Missing R2_BACKUP_BUCKET environment variable");
  return R2_BACKUP_BUCKET;
}

function passphrase() {
  const key = process.env.BACKUP_ENCRYPTION_KEY;
  if (!key) throw new Error("Missing BACKUP_ENCRYPTION_KEY environment variable");
  return key;
}

export async function spoolContactMessage(payload: Omit<SpooledContactMessage, "createdAt">) {
  const record: SpooledContactMessage = { ...payload, createdAt: new Date().toISOString() };
  const key = `${CONTACT_SPOOL_PREFIX}${record.createdAt.replace(/[:.]/g, "-")}-${randomUUID()}.json.enc`;
  const encrypted = encryptWithPassphrase(Buffer.from(JSON.stringify(record), "utf8"), passphrase());
  await putR2Object(requireBucket(), key, encrypted, "application/octet-stream");
}

// The _id comes from the spool key, so a message replayed twice (for example after a failed delete) is stored once.
function idForSpoolKey(key: string) {
  return new Types.ObjectId(createHash("sha256").update(key).digest("hex").slice(0, 24));
}

export async function replayContactSpool() {
  const bucket = requireBucket();
  const objects = await listR2Objects(bucket, CONTACT_SPOOL_PREFIX);
  if (objects.length === 0) return { replayed: 0, failed: 0 };

  await connectToDatabase();
  let replayed = 0;
  let failed = 0;
  for (const object of objects) {
    try {
      const body = await getR2Object(bucket, object.key);
      if (!body) continue;
      const record = JSON.parse(decryptWithPassphrase(body, passphrase()).toString("utf8")) as SpooledContactMessage;
      const createdAt = new Date(record.createdAt);
      // The raw collection call skips Mongoose timestamps, so the original time of the enquiry is kept.
      await ContactMessage.collection.updateOne(
        { _id: idForSpoolKey(object.key) },
        {
          $setOnInsert: {
            name: record.name,
            email: record.email,
            message: record.message,
            readAt: null,
            ...(record.source && { source: record.source }),
            createdAt,
            updatedAt: createdAt,
          },
        },
        { upsert: true }
      );
      await deleteR2Object(bucket, object.key);
      replayed += 1;
    } catch (err) {
      failed += 1;
      console.error(`Contact spool replay failed for ${object.key}:`, err);
    }
  }
  return { replayed, failed };
}
