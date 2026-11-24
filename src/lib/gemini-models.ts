import { connectToDatabase } from "@/lib/mongodb";
import { ArtworkAssistSettings } from "@/models";
import { GEMINI_MODEL_LIST_MAX } from "@/models/ArtworkAssistSettings";

const BUILT_IN_MODELS = ["gemini-3.7-flash", "gemini-3.1-flash-lite"];

// Models to pick from in the admin. Free-tier limits change, so check the Rate Limit page in AI Studio.
export const SUGGESTED_GEMINI_MODELS = [
  { id: "gemini-3.1-flash-lite", note: "Low latency and low cost. Try it first." },
  { id: "gemini-3.5-flash-lite", note: "Low-cost model for high-throughput work. A middle fallback." },
  { id: "gemini-3.8-flash", note: "Most capable Flash model. Use it last, since its free-tier quota is smallest." },
];
export const SUGGESTED_GEMINI_ORDER = SUGGESTED_GEMINI_MODELS.map((model) => model.id).join(",");
const MODEL_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/i;
const pacificClock = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hourCycle: "h23",
});

interface ModelSettings {
  geminiModels: string[];
  exhaustedModels: { model: string; until: Date }[];
}

// Returns null when the list has an invalid model ID or too many entries. An empty list is valid.
export function parseModelList(raw: string): string[] | null {
  const models = [...new Set(raw.split(",").map((model) => model.trim()).filter(Boolean))];
  if (models.length > GEMINI_MODEL_LIST_MAX) return null;
  if (!models.every((model) => MODEL_ID_PATTERN.test(model))) return null;
  return models;
}

function configuredDefault(): string[] {
  const fromEnv = parseModelList(process.env.GEMINI_ARTWORK_MODELS ?? "");
  return fromEnv?.length ? fromEnv : BUILT_IN_MODELS;
}

async function getModelSettings(): Promise<ModelSettings> {
  await connectToDatabase();
  const settings = await ArtworkAssistSettings.findOne()
    .select("geminiModels exhaustedModels")
    .lean<Partial<ModelSettings>>();
  return {
    geminiModels: settings?.geminiModels ?? [],
    exhaustedModels: settings?.exhaustedModels ?? [],
  };
}

// The order to try models in: the admin's saved order, else the env var, else the built-in default.
// Models already over their daily quota are skipped until they reset.
export async function getGeminiModelOrder(): Promise<string[]> {
  let settings: ModelSettings | null = null;
  try {
    settings = await getModelSettings();
  } catch (error) {
    console.error("Could not read Gemini model settings:", error instanceof Error ? error.message : error);
  }

  const order = settings?.geminiModels.length ? settings.geminiModels : configuredDefault();
  const now = Date.now();
  const exhausted = new Set(
    (settings?.exhaustedModels ?? []).filter((entry) => entry.until.getTime() > now).map((entry) => entry.model),
  );
  const available = order.filter((model) => !exhausted.has(model));
  // If every model is marked, try them all. The marks can be wrong, and a failed try costs little.
  return available.length ? available : order;
}

export async function saveGeminiModelOrder(models: string[]): Promise<void> {
  await connectToDatabase();
  await ArtworkAssistSettings.findOneAndUpdate({}, { geminiModels: models }, { upsert: true });
}

export async function getGeminiModelStatus(): Promise<{
  saved: string[];
  order: string[];
  exhausted: { model: string; until: Date }[];
}> {
  const settings = await getModelSettings();
  const now = Date.now();
  return {
    saved: settings.geminiModels,
    order: settings.geminiModels.length ? settings.geminiModels : configuredDefault(),
    exhausted: settings.exhaustedModels.filter((entry) => entry.until.getTime() > now),
  };
}

export async function recordDailyLimit(model: string): Promise<void> {
  await connectToDatabase();
  const until = nextPacificMidnight();
  await ArtworkAssistSettings.updateOne({}, { $pull: { exhaustedModels: { model } } }, { upsert: true });
  await ArtworkAssistSettings.updateOne({}, { $push: { exhaustedModels: { model, until } } }, { upsert: true });
}

// Gemini resets daily quotas at midnight Pacific time, so the next reset is the next Pacific midnight.
export function nextPacificMidnight(now = Date.now()): Date {
  const wallClockNow = pacificWallClockAsUtc(now);
  const day = new Date(wallClockNow);
  const nextMidnightWallClock = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() + 1);
  // Two passes settle the offset, which differs before and after a daylight-saving change.
  let instant = nextMidnightWallClock;
  for (let pass = 0; pass < 2; pass++) {
    instant = nextMidnightWallClock - (pacificWallClockAsUtc(instant) - instant);
  }
  return new Date(instant);
}

function pacificWallClockAsUtc(instant: number): number {
  const parts = Object.fromEntries(pacificClock.formatToParts(instant).map((part) => [part.type, part.value]));
  return Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
}
