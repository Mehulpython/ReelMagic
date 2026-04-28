// ─── Suno AI Music Generation Integration ────────────────────
// Generates background music for video ads using Suno API

import { logger } from "./logger";
const log = logger.child({ module: "suno" });

const SUNO_BASE = "https://api.suno.ai/v1";

// Alternative: Use fal.ai music gen as Suno proxy
const FAL_MUSIC_MODEL = "fal-ai/stable-audio";

interface BGMOptions {
  genre?: string;        // e.g., "upbeat pop", "cinematic orchestral", "lo-fi hip hop"
  mood?: string;         // e.g., "energetic", "dramatic", "calm"
  durationSeconds?: number;
  instrumental?: boolean;
}

interface BGMResult {
  audioUrl: string;
  durationSeconds: number;
  title: string;
}

// ─── Genre Presets for Ad Templates ──────────────────────────

export const BGM_PRESETS: Record<string, BGMOptions> = {
  skibidi: {
    genre: "electronic trap bass",
    mood: "hype energetic chaotic",
    durationSeconds: 10,
    instrumental: true,
  },
  democrat: {
    genre: "inspiring orchestral cinematic",
    mood: "hopeful patriotic uplifting",
    durationSeconds: 10,
    instrumental: true,
  },
  "product-launch": {
    genre: "modern synthwave pop",
    mood: "exciting sleek futuristic",
    durationSeconds: 10,
    instrumental: true,
  },
  beauty: {
    genre: "lo-fi chill ambient pop",
    mood: "soft dreamy luxurious",
    durationSeconds: 10,
    instrumental: true,
  },
  political: {
    genre: "dramatic orchestral tension",
    mood: "serious urgent powerful",
    durationSeconds: 10,
    instrumental: true,
  },
  dropship: {
    genre: "upbeat electronic dance",
    mood: "urgent exciting limited-time",
    durationSeconds: 10,
    instrumental: true,
  },
};

// ─── Generate BGM via Suno API ───────────────────────────────

export async function generateBGM(
  prompt: string,
  options: BGMOptions = {}
): Promise<BGMResult> {
  const apiKey = process.env.SUNO_API_KEY;

  if (!apiKey) {
    // Fallback: Try fal.ai Stable Audio
    return generateBGMViaFal(prompt, options);
  }

  const genre = options.genre || "upbeat pop";
  const mood = options.mood || "energetic";
  const duration = options.durationSeconds || 10;

  const fullPrompt = `${genre} ${mood} background music, ${prompt}, instrumental, no vocals`;

  // Suno custom generation
  const response = await fetch(`${SUNO_BASE}/custom/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt: fullPrompt,
      tags: `${genre} ${mood} instrumental`,
      duration: duration,
      instrumental: options.instrumental ?? true,
      output_quality: "standard",
    }),
  });

  if (!response.ok) {
    // Fallback to fal.ai on Suno failure
    log.warn({ status: response.status }, "Suno API error, falling back to fal.ai");
    return generateBGMViaFal(prompt, options);
  }

  const data = await response.json();
  const song = data?.[0];

  if (!song?.audio_url) {
    throw new Error("Suno returned no audio URL");
  }

  return {
    audioUrl: song.audio_url,
    durationSeconds: duration,
    title: song.title || "Generated BGM",
  };
}

// ─── Fallback: Generate BGM via fal.ai Stable Audio ─────────

async function generateBGMViaFal(
  prompt: string,
  options: BGMOptions = {}
): Promise<BGMResult> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    log.warn("No FAL_KEY set, returning empty BGM");
    return { audioUrl: "", durationSeconds: 0, title: "No BGM" };
  }

  const { fal } = await import("@fal-ai/client");
  fal.config({ credentials: falKey });

  const genre = options.genre || "upbeat pop";
  const mood = options.mood || "energetic";
  const duration = Math.min(options.durationSeconds || 10, 30);

  const fullPrompt = `${genre} ${mood} instrumental background music, ${prompt}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = await fal.run(FAL_MUSIC_MODEL, {
    input: {
      prompt: fullPrompt,
      seconds_start: 0,
      seconds_total: duration,
    },
  });

  const audioUrl = result?.audio?.url || result?.audio_url || "";

  return {
    audioUrl,
    durationSeconds: duration,
    title: "AI Generated BGM",
  };
}

// ─── Generate BGM from Template Preset ───────────────────────

export async function generateBGMForTemplate(
  templateId: string,
  customPrompt?: string
): Promise<BGMResult> {
  const preset = BGM_PRESETS[templateId];
  const prompt = customPrompt || `Background music for ${templateId} style video ad`;

  return generateBGM(prompt, preset);
}
