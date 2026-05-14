import Replicate from "replicate";

// ─── Replicate Client Configuration ──────────────────────────
// Lazy-initialized to avoid throwing during Next.js build.

let _replicate: Replicate | null = null;

function getReplicate(): Replicate {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) {
    throw new Error("REPLICATE_API_TOKEN environment variable is required");
  }
  if (!_replicate) {
    _replicate = new Replicate({ auth: apiToken });
  }
  return _replicate;
}

/**
 * Generate video from text prompt using Replicate
 */
export async function generateVideoFromText(params: {
  prompt: string;
  negativePrompt?: string;
  duration?: number;
  aspectRatio?: string;
  model?: string;
}): Promise<{ url: string }> {
  const output = await getReplicate().run(
    "minimax/video-01",
    {
      input: {
        prompt: params.prompt,
        negative_prompt: params.negativePrompt,
      },
    }
  );

  return {
    url: output as unknown as string,
  };
}

/**
 * Generate video from image using Replicate
 */
export async function generateVideoFromImage(params: {
  imageUrl: string;
  prompt: string;
  duration?: number;
  model?: string;
}): Promise<{ url: string }> {
  const output = await getReplicate().run(
    "stability-ai/stable-video-diffusion",
    {
      input: {
        input_image: params.imageUrl,
      },
    }
  );

  return {
    url: output as unknown as string,
  };
}

/**
 * Run audio/music generation on Replicate
 */
export async function generateMusic(params: {
  prompt: string;
  durationSeconds?: number;
}): Promise<{ url: string }> {
  const output = await getReplicate().run(
    "meta/musicgen",
    {
      input: {
        prompt: params.prompt,
        duration: params.durationSeconds || 10,
      },
    }
  );

  return {
    url: output as unknown as string,
  };
}
