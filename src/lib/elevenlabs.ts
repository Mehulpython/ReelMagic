// ─── ElevenLabs Voiceover Integration ────────────────────────

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

interface VoiceOptions {
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  speed?: number;
}

// Popular voices for ad narration
export const AD_VOICES = {
  "rachel": "21m00Tcm4TlvDq8ikWAM",     // Female, warm, professional
  "drew": "29vD33N1CtxCmqQRPOHJ",        // Male, deep, authoritative
  "bella": "EXAVITQu4vr4xnSDxMaL",       // Female, young, energetic
  "antonio": "ErXwobaYiN019PkySvjV",     // Male, dramatic, cinematic
  "aria": "SVYFraz0ZEmkDBHXX9vo",         // Female, narrator
} as const;

export type AdVoice = keyof typeof AD_VOICES;

export async function generateVoiceover(
  text: string,
  options: VoiceOptions = {}
): Promise<{ audioUrl: string; durationSeconds: number }> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY environment variable is required for voiceover generation");
  }

  const voiceId = options.voiceId || AD_VOICES.rachel;

  const response = await fetch(
    `${ELEVENLABS_BASE}/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: options.stability ?? 0.5,
          similarity_boost: options.similarityBoost ?? 0.75,
          style: options.style ?? 0.3,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`ElevenLabs error: ${response.status}`);
  }

  // Return audio as blob URL (in production, upload to R2)
  const buffer = Buffer.from(await response.arrayBuffer());
  const durationSeconds = Math.ceil(buffer.length / 16000); // rough estimate

  return {
    audioUrl: `data:audio/mpeg;base64,${buffer.toString("base64")}`,
    durationSeconds,
  };
}

export async function listVoices(): Promise<
  Array<{ id: string; name: string; labels: Record<string, string> }>
> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return [];

  const response = await fetch(`${ELEVENLABS_BASE}/voices`, {
    headers: { "xi-api-key": apiKey },
  });

  if (!response.ok) return [];

  const data = await response.json();
  return data.voices?.map((v: { voice_id: string; name: string; labels: Record<string, string> }) => ({
    id: v.voice_id,
    name: v.name,
    labels: v.labels,
  }));
}
