// Shared Gemini plumbing for the admin AI assistants. Model output is untrusted: each caller's `parse`
// validates it, and a model whose output fails validation falls through to the next model.

export const GEMINI_MODELS = (process.env.GEMINI_ARTWORK_MODELS ?? "gemini-3.7-flash,gemini-3.1-flash-lite")
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean);

const PUBLIC_ID_PATTERN = /^[\w\-/.]{1,300}$/;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export interface AiImage {
  mimeType: string;
  data: string;
}

export function isValidPublicId(value: unknown): value is string {
  return typeof value === "string" && PUBLIC_ID_PATTERN.test(value) && !value.includes("..");
}

export async function fetchCloudinaryImage(cloudName: string, publicId: string): Promise<AiImage> {
  const url = `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/image/upload/c_limit,w_1024,q_auto,f_jpg/${publicId}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000), cache: "no-store" });
  if (!response.ok) throw new Error(`Cloudinary returned HTTP ${response.status}`);
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > MAX_IMAGE_BYTES) throw new Error("Image is too large for the assistant");
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("Image is too large for the assistant");
  return { mimeType: "image/jpeg", data: Buffer.from(bytes).toString("base64") };
}

export async function requestGeminiSuggestion<T>({
  apiKey,
  prompt,
  image,
  schema,
  parse,
}: {
  apiKey: string;
  prompt: string;
  image: AiImage;
  schema: unknown;
  parse: (raw: unknown) => T | null;
}): Promise<{ suggestion: T; model: string }> {
  const failures: string[] = [];

  for (const model of GEMINI_MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          signal: AbortSignal.timeout(30_000),
          cache: "no-store",
          body: JSON.stringify({
            contents: [{
              role: "user",
              parts: [{ text: prompt }, { inline_data: { mime_type: image.mimeType, data: image.data } }],
            }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json",
              responseSchema: schema,
            },
          }),
        },
      );
      if (!response.ok) {
        failures.push(`${model} returned HTTP ${response.status}`);
        continue;
      }
      const payload = await response.json();
      const output = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
      const suggestion = typeof output === "string" ? parseOutput(output, parse) : null;
      if (suggestion) return { suggestion, model };
      failures.push(`${model} returned an unusable response`);
    } catch {
      failures.push(`${model} could not be reached`);
    }
  }

  throw new Error(`No model produced a suggestion: ${failures.join("; ")}`);
}

function parseOutput<T>(output: string, parse: (raw: unknown) => T | null): T | null {
  try {
    return parse(JSON.parse(output));
  } catch {
    return null;
  }
}
