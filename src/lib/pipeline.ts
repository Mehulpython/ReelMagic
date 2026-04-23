import type { VideoJobData, VideoJobResult } from "./queue";
import { generateImage, generateVideo } from "./fal";
import { generateVideoFromImage } from "./replicate";
import { uploadFromUrl, videoKey, thumbnailKey } from "./storage";

// ─── Pipeline Configuration ──────────────────────────────────

export const PIPELINE_STEPS = [
  { id: "analyze", name: "Analyzing script", weight: 5 },
  { id: "keyframe", name: "Generating keyframe", weight: 15 },
  { id: "video", name: "Generating video", weight: 40 },
  { id: "audio", name: "Adding audio", weight: 15 },
  { id: "upload", name: "Uploading to CDN", weight: 15 },
  { id: "finalize", name: "Finalizing", weight: 10 },
] as const;

export type PipelineStepId = (typeof PIPELINE_STEPS)[number]["id"];

// ─── Progress Tracker ────────────────────────────────────────

export class ProgressTracker {
  private completedWeight = 0;

  constructor(
    private onProgress: (pct: number) => Promise<void>,
    private steps = PIPELINE_STEPS
  ) {}

  async completeStep(stepId: PipelineStepId): Promise<void> {
    const step = this.steps.find((s) => s.id === stepId);
    if (step) {
      this.completedWeight += step.weight;
      const pct = Math.min(100, Math.round(this.completedWeight));
      await this.onProgress(pct);
    }
  }
}

// ─── Main Pipeline ───────────────────────────────────────────

export async function runVideoPipeline(params: {
  data: VideoJobData;
  onProgress: (pct: number) => Promise<void>;
}): Promise<VideoJobResult> {
  const { data, onProgress } = params;
  const tracker = new ProgressTracker(onProgress);

  // Step 1: Analyze script
  const enhancedPrompt = buildPrompt(data.prompt, data.style);
  await tracker.completeStep("analyze");

  // Step 2: Generate keyframe image
  const imageWidth = data.aspectRatio === "9:16" ? 576 : 1024;
  const imageHeight = data.aspectRatio === "9:16" ? 1024 : 576;

  const imageResult = await generateImage({
    prompt: enhancedPrompt,
    negativePrompt: data.negativePrompt,
    width: imageWidth,
    height: imageHeight,
  });
  await tracker.completeStep("keyframe");

  // Step 3: Generate video from keyframe
  let videoUrl = "";
  const duration = String(Math.min(data.durationSeconds, 10));

  try {
    const result = await generateVideo({
      imageUrl: imageResult.url,
      prompt: enhancedPrompt,
      duration,
    });
    videoUrl = result.url;
  } catch {
    // Fallback to Replicate
    const result = await generateVideoFromImage({
      imageUrl: imageResult.url,
      prompt: enhancedPrompt,
      duration: Math.min(data.durationSeconds, 10),
    });
    videoUrl = result.url;
  }
  await tracker.completeStep("video");

  // Step 4: TODO - Audio (ElevenLabs voiceover + Suno BGM)
  await tracker.completeStep("audio");

  // Step 5: Upload to R2 storage
  let outputUrl = videoUrl;
  let thumbUrl = imageResult.url;

  if (process.env.R2_ENDPOINT) {
    try {
      const vKey = videoKey(data.userId, data.jobId);
      outputUrl = await uploadFromUrl(videoUrl, vKey, "video/mp4");

      const tKey = thumbnailKey(data.userId, data.jobId);
      thumbUrl = await uploadFromUrl(imageResult.url, tKey, "image/jpeg");
    } catch (err) {
      console.error("R2 upload failed, using original URLs:", err);
    }
  }
  await tracker.completeStep("upload");

  // Step 6: Finalize
  const costCents = calculateCost(data.durationSeconds, data.model);
  await tracker.completeStep("finalize");

  return {
    outputUrl,
    thumbnailUrl: thumbUrl,
    durationSeconds: data.durationSeconds,
    costCents,
    model: data.model || "kling-v1",
  };
}

// ─── Helpers ─────────────────────────────────────────────────

function buildPrompt(prompt: string, style?: string): string {
  const parts: string[] = [];
  if (style) parts.push(`${style} style.`);
  parts.push(prompt);
  parts.push("cinematic lighting, high quality, 4k, professional video");
  return parts.join(" ");
}

function calculateCost(durationSeconds: number, model?: string): number {
  const rates: Record<string, number> = {
    "kling-v1": 10,       // $0.10/sec
    "seedance-2": 8,      // $0.08/sec
    "cogvideox": 6,       // $0.06/sec
    "wan": 4,             // $0.04/sec
    "dream-machine": 15,  // $0.15/sec
  };
  const rate = rates[model || "kling-v1"] || 10;
  return Math.round(durationSeconds * rate);
}
