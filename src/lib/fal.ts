import { fal } from "@fal-ai/client";

// ─── fal.AI Client Configuration ─────────────────────────────
// fal.AI is used primarily for image generation (scene visuals)

if (process.env.FAL_KEY) {
  fal.config({
    credentials: process.env.FAL_KEY,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FalResult = any;

/**
 * Generate an image using fal.AI FLUX
 * Used for creating scene visuals, thumbnails, and backgrounds
 */
export async function generateImage(params: {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  model?: string;
}): Promise<{ url: string; seed?: number }> {
  const input: Record<string, unknown> = {
    prompt: params.prompt,
    image_size: {
      width: params.width || 1024,
      height: params.height || 1024,
    },
    num_images: 1,
  };

  const result: FalResult = await fal.run(
    params.model || "fal-ai/flux/schnell",
    { input }
  );

  const images = result?.images as Array<{ url: string }> | undefined;
  return {
    url: images?.[0]?.url ?? "",
    seed: result?.seed as number | undefined,
  };
}

/**
 * Run a video model on fal.AI (image-to-video)
 */
export async function generateVideo(params: {
  imageUrl: string;
  prompt: string;
  duration?: string;
  model?: string;
}): Promise<{ url: string }> {
  const result: FalResult = await fal.run(
    params.model || "fal-ai/kling-video/v1/standard/image-to-video",
    {
      input: {
        image_url: params.imageUrl,
        prompt: params.prompt,
        duration: params.duration || "5",
      },
    }
  );

  const video = result?.video as { url: string } | undefined;
  return {
    url: video?.url ?? "",
  };
}

export { fal };
