// Admin-only helpers for the AI artwork assistant. The route handler checks the admin session;
// everything here treats the model output as untrusted and validates it before it reaches the form.

export const ARTWORK_ASSIST_MODELS = (process.env.GEMINI_ARTWORK_MODELS ?? "gemini-3.7-flash,gemini-3.1-flash-lite")
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean);

const PUBLIC_ID_PATTERN = /^[\w\-/.]{1,300}$/;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_OPTIONS = 200;
const MAX_OPTION_LENGTH = 100;

export interface ArtworkAssistRequest {
  publicId: string;
  mediums: string[];
  subjects: string[];
}

export interface ArtworkSuggestion {
  title: string;
  description: string;
  seoDescription: string;
  altText: string;
  medium: string;
  subjects: string[];
}

const ARTWORK_SUGGESTION_SCHEMA = {
  type: "OBJECT",
  required: ["title", "description", "seoDescription", "altText", "medium", "subjects"],
  properties: {
    title: { type: "STRING" },
    description: { type: "STRING" },
    seoDescription: { type: "STRING" },
    altText: { type: "STRING" },
    medium: { type: "STRING" },
    subjects: { type: "ARRAY", items: { type: "STRING" } },
  },
};

const readOptionList = (value: unknown): string[] | null => {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_OPTIONS) return null;
  const options: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return null;
    const name = item.trim();
    if (!name || name.length > MAX_OPTION_LENGTH) return null;
    options.push(name);
  }
  return options;
};

export function parseAssistRequest(body: unknown): ArtworkAssistRequest | null {
  if (!body || typeof body !== "object") return null;
  const { publicId, mediums, subjects } = body as Record<string, unknown>;
  if (typeof publicId !== "string" || !PUBLIC_ID_PATTERN.test(publicId) || publicId.includes("..")) return null;
  const mediumList = readOptionList(mediums);
  const subjectList = readOptionList(subjects);
  if (!mediumList || !subjectList) return null;
  return { publicId, mediums: mediumList, subjects: subjectList };
}

export function buildArtworkPrompt({ mediums, subjects }: Pick<ArtworkAssistRequest, "mediums" | "subjects">): string {
  return [
    "You are helping an artist catalogue an original artwork for her online portfolio.",
    "The artist paints in watercolor, acrylic, pencil and oil. Describe only what is visible in the photo.",
    "Do not invent dimensions, dates, prices, signatures or techniques you cannot see.",
    "Return JSON with these fields:",
    "- title: a short, evocative title (at most 80 characters).",
    "- description: one to three sentences on the subject, mood, colours and composition for visitors (at most 600 characters).",
    "- seoDescription: one plain sentence for search results (at most 160 characters, no quotation marks).",
    "- altText: a concise description for screen readers that starts with what is shown (at most 200 characters).",
    `- medium: exactly one of these mediums, or an empty string if none clearly fits: ${mediums.join(", ") || "none"}.`,
    `- subjects: zero to four of these subjects that clearly apply: ${subjects.join(", ") || "none"}.`,
  ].join("\n");
}

const text = (value: unknown, maxLength: number): string =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const matchOption = (value: string, options: string[]): string | undefined => {
  const wanted = value.trim().toLowerCase();
  return options.find((option) => option.toLowerCase() === wanted);
};

// Returns null when the output is unusable, so the caller can fall back to the next model.
export function parseArtworkSuggestion(
  raw: unknown,
  options: Pick<ArtworkAssistRequest, "mediums" | "subjects">,
): ArtworkSuggestion | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const title = text(record.title, 80);
  if (!title) return null;

  const medium = matchOption(text(record.medium, MAX_OPTION_LENGTH), options.mediums) ?? "";
  const subjects = Array.isArray(record.subjects)
    ? [...new Set(record.subjects.flatMap((subject) => {
        const match = typeof subject === "string" ? matchOption(subject, options.subjects) : undefined;
        return match ? [match] : [];
      }))].slice(0, 4)
    : [];

  return {
    title,
    description: text(record.description, 600),
    seoDescription: text(record.seoDescription, 160),
    altText: text(record.altText, 200),
    medium,
    subjects,
  };
}

export async function fetchArtworkImage(cloudName: string, publicId: string): Promise<{ mimeType: string; data: string }> {
  const url = `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/image/upload/c_limit,w_1024,q_auto,f_jpg/${publicId}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000), cache: "no-store" });
  if (!response.ok) throw new Error(`Cloudinary returned HTTP ${response.status}`);
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > MAX_IMAGE_BYTES) throw new Error("Image is too large for the assistant");
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("Image is too large for the assistant");
  return { mimeType: "image/jpeg", data: Buffer.from(bytes).toString("base64") };
}

export async function requestArtworkSuggestion({
  apiKey,
  image,
  request,
}: {
  apiKey: string;
  image: { mimeType: string; data: string };
  request: ArtworkAssistRequest;
}): Promise<{ suggestion: ArtworkSuggestion; model: string }> {
  const prompt = buildArtworkPrompt(request);
  const failures: string[] = [];

  for (const model of ARTWORK_ASSIST_MODELS) {
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
              responseSchema: ARTWORK_SUGGESTION_SCHEMA,
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
      const suggestion = typeof output === "string"
        ? parseArtworkSuggestion(JSON.parse(output), request)
        : null;
      if (suggestion) return { suggestion, model };
      failures.push(`${model} returned an unusable response`);
    } catch {
      failures.push(`${model} could not be reached`);
    }
  }

  throw new Error(`No model produced a suggestion: ${failures.join("; ")}`);
}
