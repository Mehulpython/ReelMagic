import { fal } from "@fal-ai/client";

// ─── fal.AI Client Configuration ─────────────────────────────

if (process.env.FAL_KEY) {
  fal.config({
    credentials: process.env.FAL_KEY,
  });
}

// ─── Model IDs ───────────────────────────────────────────────

export const FAL_MODELS = {
  // Image generation
  "flux-2-pro": "fal-ai/flux/pro",
  "flux-2-schnell": "fal-ai/flux/schnell",
  "flux-2-dev": "fal-ai/flux/dev",
  "flux-1.1-ultra": "fal-ai/flux-realism",

  // Video generation (image-to-video)
  "kling-v1-standard": "fal-ai/kling-video/v1/standard/image-to-video",
  "kling-v1-pro": "fal-ai/kling-video/v1/pro/image-to-video",
  "kling-v2-master": "fal-ai/kling-video/v2/master/image-to-video",

  // Video generation (text-to-video)
  "kling-v1-t2v": "fal-ai/kling-video/v1/standard/text-to-video",
  "minimax-video": "fal-ai/minimax/video-01-live",

  // Music
  "stable-audio": "fal-ai/stable-audio",
} as const;

export type FalImageModel = keyof typeof FAL_MODELS & `${string}`;
export type FalVideoModel = keyof typeof FAL_MODELS & `${string}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FalResult = any;

// ─── Image Generation ────────────────────────────────────────

export interface GenerateImageParams {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  model?: string;
  seed?: number;
  numImages?: number;
}

export interface ImageResult {
  url: string;
  width: number;
  height: number;
  seed?: number;
}

export async function generateImage(params: GenerateImageParams): Promise<ImageResult> {
  const model = params.model || FAL_MODELS["flux-2-schnell"];

  const input: Record<string, unknown> = {
    prompt: params.prompt,
    image_size: {
      width: params.width || 1024,
      height: params.height || 1024,
    },
    num_images: params.numImages || 1,
  };

  if (params.negativePrompt) {
    input.negative_prompt = params.negativePrompt;
  }
  if (params.seed !== undefined) {
    input.seed = params.seed;
  }

  // FLUX 2 pro supports additional params
  if (model.includes("flux/pro")) {
    input.guidance_scale = 3.5;
    input.num_inference_steps = 28;
  }

  const result: FalResult = await fal.run(model, { input });

  const images = result?.images as Array<{ url: string; width: number; height: number }> | undefined;
  const firstImage = images?.[0];

  return {
    url: firstImage?.url ?? "",
    width: firstImage?.width || params.width || 1024,
    height: firstImage?.height || params.height || 1024,
    seed: result?.seed as number | undefined,
  };
}

// ─── Video Generation (Image-to-Video) ───────────────────────

export interface GenerateVideoParams {
  imageUrl: string;
  prompt: string;
  duration?: string;           // "5" or "10"
  model?: string;
  negativePrompt?: string;
  cfgScale?: number;           // How closely to follow prompt (0-1)
  aspectRatio?: string;        // "16:9" or "9:16"
}

export interface VideoResult {
  url: string;
  durationSeconds?: number;
}

export async function generateVideo(params: GenerateVideoParams): Promise<VideoResult> {
  const model = params.model || FAL_MODELS["kling-v1-standard"];

  const input: Record<string, unknown> = {
    image_url: params.imageUrl,
    prompt: params.prompt,
    duration: params.duration || "5",
  };

  if (params.negativePrompt) {
    input.negative_prompt = params.negativePrompt;
  }
  if (params.cfgScale !== undefined) {
    input.cfg_scale = params.cfgScale;
  }

  const result: FalResult = await fal.run(model, { input });

  const video = result?.video as { url: string } | undefined;

  return {
    url: video?.url ?? result?.url ?? "",
    durationSeconds: result?.duration as number | undefined,
  };
}

// ─── Video Generation (Text-to-Video) ────────────────────────

export interface GenerateTextToVideoParams {
  prompt: string;
  negativePrompt?: string;
  duration?: string;
  aspectRatio?: string;
  model?: string;
}

export async function generateTextToVideo(
  params: GenerateTextToVideoParams
): Promise<VideoResult> {
  const model = params.model || FAL_MODELS["kling-v1-t2v"];

  const input: Record<string, unknown> = {
    prompt: params.prompt,
    duration: params.duration || "5",
    aspect_ratio: params.aspectRatio || "16:9",
  };

  if (params.negativePrompt) {
    input.negative_prompt = params.negativePrompt;
  }

  const result: FalResult = await fal.run(model, { input });

  const video = result?.video as { url: string } | undefined;

  return {
    url: video?.url ?? result?.url ?? "",
    durationSeconds: result?.duration as number | undefined,
  };
}

// ─── Batch: Generate Multiple Keyframes ──────────────────────

export async function generateKeyframes(
  prompts: string[],
  params: Omit<GenerateImageParams, "prompt">
): Promise<ImageResult[]> {
  const results = await Promise.all(
    prompts.map((prompt) =>
      generateImage({ ...params, prompt, numImages: 1 })
    )
  );
  return results;
}

export { fal };
