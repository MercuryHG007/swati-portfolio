import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

// Same layout as scripts/backup-mongo-to-r2.mjs: salt (16) | iv (12) | auth tag (16) | ciphertext.
// AES-256-GCM, with the key derived from the passphrase by scrypt.
export function encryptWithPassphrase(plain: Buffer, passphrase: string): Buffer {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", scryptSync(passphrase, salt, 32), iv);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([salt, iv, cipher.getAuthTag(), body]);
}

export function decryptWithPassphrase(payload: Buffer, passphrase: string): Buffer {
  const salt = payload.subarray(0, 16);
  const iv = payload.subarray(16, 28);
  const tag = payload.subarray(28, 44);
  const body = payload.subarray(44);
  const decipher = createDecipheriv("aes-256-gcm", scryptSync(passphrase, salt, 32), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]);
}
