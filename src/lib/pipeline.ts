import type { VideoJobData, VideoJobResult } from "./queue";
import { generateImage, generateVideo } from "./fal";
import { generateVideoFromImage } from "./replicate";
import { generateVoiceover } from "./elevenlabs";
import { generateBGMForTemplate } from "./suno";
import { assembleVideo, generateTimedCaptions } from "./ffmpeg";
import { uploadToR2, uploadFromUrl, videoKey, thumbnailKey, audioKey } from "./storage";
import { logger } from "./logger";

const log = logger.child({ module: "pipeline" });

// Re-export storage key helpers
export { videoKey, thumbnailKey, audioKey };

// ─── Pipeline Configuration ──────────────────────────────────

export const PIPELINE_STEPS = [
  { id: "analyze", name: "Analyzing script", weight: 5 },
  { id: "keyframe", name: "Generating keyframe", weight: 15 },
  { id: "video", name: "Generating video", weight: 30 },
  { id: "voiceover", name: "Generating voiceover", weight: 10 },
  { id: "bgm", name: "Generating background music", weight: 10 },
  { id: "assemble", name: "Assembling final video", weight: 15 },
  { id: "upload", name: "Uploading to CDN", weight: 10 },
  { id: "finalize", name: "Finalizing", weight: 5 },
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

  // Step 1: Analyze script → build enhanced prompt
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
    // Fallback to Replicate (CogVideoX)
    const result = await generateVideoFromImage({
      imageUrl: imageResult.url,
      prompt: enhancedPrompt,
      duration: Math.min(data.durationSeconds, 10),
    });
    videoUrl = result.url;
  }
  await tracker.completeStep("video");

  // Step 4: Generate voiceover (ElevenLabs)
  let voiceoverUrl: string | undefined;
  let voiceoverDuration = 0;

  if (data.voiceover !== false && data.prompt) {
    try {
      const voiceResult = await generateVoiceover(data.prompt, {
        voiceId: data.voiceId,
      });
      voiceoverUrl = voiceResult.audioUrl;
      voiceoverDuration = voiceResult.durationSeconds;

      // Upload voiceover to R2 if possible
      if (voiceoverUrl && process.env.R2_ENDPOINT) {
        try {
          const vKey = audioKey(data.userId, data.jobId);
          voiceoverUrl = await uploadFromUrl(voiceoverUrl, vKey, "audio/mpeg");
        } catch (err) {
          log.warn({ err }, "Voiceover R2 upload failed");
        }
      }
    } catch (err) {
      log.warn({ err }, "Voiceover generation failed, continuing without it");
    }
  }
  await tracker.completeStep("voiceover");

  // Step 5: Generate BGM (Suno / fal.ai Stable Audio)
  let bgmUrl: string | undefined;

  if (data.bgm !== false) {
    try {
      const bgmResult = await generateBGMForTemplate(
        data.templateId || "product-launch",
        enhancedPrompt
      );
      bgmUrl = bgmResult.audioUrl;
    } catch (err) {
      log.warn({ err }, "BGM generation failed, continuing without it");
    }
  }
  await tracker.completeStep("bgm");

  // Step 6: Assemble final video with FFmpeg
  let finalVideoUrl = videoUrl;
  let actualDuration = data.durationSeconds;

  if (process.env.FFMPEG_PATH || process.env.NODE_ENV !== "production") {
    try {
      const captions = data.captions || generateTimedCaptions(
        data.prompt,
        data.durationSeconds
      );

      const assemblyResult = await assembleVideo({
        videoUrl,
        voiceoverUrl,
        bgmUrl,
        captions,
        watermark: data.watermark || "ReelMagic",
        width: data.aspectRatio === "9:16" ? 1080 : 1920,
        height: data.aspectRatio === "9:16" ? 1920 : 1080,
      });

      actualDuration = assemblyResult.durationSeconds;

      // Upload assembled video to R2
      if (process.env.R2_ENDPOINT) {
        const { readFile: readFs } = await import("fs/promises");
        const buffer = await readFs(assemblyResult.outputPath);
        const vKey = videoKey(data.userId, data.jobId);
        finalVideoUrl = await uploadToR2(vKey, buffer, "video/mp4");

        // Cleanup temp file
        try {
          const { unlink } = await import("fs/promises");
          await unlink(assemblyResult.outputPath);
        } catch { /* ignore */ }
      } else {
        finalVideoUrl = `file://${assemblyResult.outputPath}`;
      }
    } catch (err) {
      log.warn({ err }, "FFmpeg assembly failed, using raw video");
      finalVideoUrl = videoUrl;
    }
  }
  await tracker.completeStep("assemble");

  // Step 7: Upload to R2 (if not already done in assembly)
  let thumbUrl = imageResult.url;

  if (!finalVideoUrl.startsWith("file://") && process.env.R2_ENDPOINT) {
    // Upload raw video if assembly was skipped
    if (finalVideoUrl === videoUrl) {
      try {
        const vKey = videoKey(data.userId, data.jobId);
        finalVideoUrl = await uploadFromUrl(videoUrl, vKey, "video/mp4");
      } catch (err) {
        log.error({ err }, "R2 video upload failed");
      }
    }

    // Upload thumbnail
    try {
      const tKey = thumbnailKey(data.userId, data.jobId);
      thumbUrl = await uploadFromUrl(imageResult.url, tKey, "image/jpeg");
    } catch (err) {
      log.error({ err }, "R2 thumbnail upload failed");
    }
  }
  await tracker.completeStep("upload");

  // Step 8: Finalize
  const costCents = calculateCost(data.durationSeconds, data.model);
  await tracker.completeStep("finalize");

  return {
    outputUrl: finalVideoUrl,
    thumbnailUrl: thumbUrl,
    durationSeconds: actualDuration,
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
    "kling-v2": 15,       // $0.15/sec
    "seedance-2": 8,      // $0.08/sec
    "cogvideox": 6,       // $0.06/sec
    "wan": 4,             // $0.04/sec
    "dream-machine": 15,  // $0.15/sec
  };
  const rate = rates[model || "kling-v1"] || 10;
  return Math.round(durationSeconds * rate);
}
