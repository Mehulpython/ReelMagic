import Replicate from "replicate";

// ─── Replicate Client Configuration ──────────────────────────
// Replicate is used for video generation models (Wan, CogVideo, etc.)

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

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
  // TODO: Implement with actual Replicate model
  // Example models: stability-ai/stable-video-diffusion, minimax/video-01
  const output = await replicate.run(
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
  // TODO: Implement with actual Replicate image-to-video model
  const output = await replicate.run(
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
  duration?: number;
  style?: string;
}): Promise<{ url: string }> {
  // TODO: Implement with music generation model
  const output = await replicate.run(
    "meta/musicgen",
    {
      input: {
        prompt: params.prompt,
        duration: params.duration || 15,
      },
    }
  );

  return {
    url: output as unknown as string,
  };
}

export { replicate };
