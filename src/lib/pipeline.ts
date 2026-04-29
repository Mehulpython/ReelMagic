import type { VideoJobData, VideoJobResult } from "./queue";
import { generateImage, generateVideo } from "./fal";
import { generateVideoFromImage } from "./replicate";
import { generateVoiceover } from "./elevenlabs";
import { generateBGMForTemplate } from "./suno";
import { assembleVideo, generateTimedCaptions, extractThumbnail } from "./ffmpeg";
import { generateCaptions, toFFmpegDrawtext } from "./captions";
import { uploadToR2, uploadFromUrl, videoKey, thumbnailKey, audioKey } from "./storage";
import { enqueueAssembly } from "./ffmpeg-queue";
import { translateScript, suggestVoiceForLanguage } from "./translate";
import { logger } from "./logger";

const log = logger.child({ module: "pipeline" });

// Re-export storage key helpers
export { videoKey, thumbnailKey, audioKey };

// ─── Pipeline Configuration ──────────────────────────────────

export const PIPELINE_STEPS = [
  { id: "analyze", name: "Analyzing script", weight: 5 },
  { id: "keyframe", name: "Generating keyframe", weight: 15 },
  { id: "video", name: "Generating video (AI)", weight: 30 },
  { id: "voiceover", name: "Recording voiceover", weight: 10 },
  { id: "bgm", name: "Composing background music", weight: 10 },
  { id: "assemble", name: "Assembling final video", weight: 15 },
  { id: "ffmpeg-queue", name: "FFmpeg processing (async)", weight: 15 },
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
  const isImageToVideo = data.mode === "image-to-video" && !!data.inputImageUrl;
  const targetLang = data.language || "en";

  // Step 1: Analyze script → build enhanced prompt
  // Translate script if non-English target language
  let scriptForVoiceover = data.prompt;
  if (targetLang !== "en" && data.prompt) {
    scriptForVoiceover = translateScript(data.prompt, targetLang);
    log.info({ from: "en", to: targetLang }, "Script translated for voiceover");
  }

  const enhancedPrompt = buildPrompt(data.prompt, data.style);
  await tracker.completeStep("analyze");

  // Step 2: Generate keyframe image — SKIP in image-to-video mode
  let imageResult: { url: string } | undefined;
  let inputImageUrl: string;

  if (isImageToVideo) {
    // Use uploaded image directly
    inputImageUrl = data.inputImageUrl!;
    log.info({ jobId: data.jobId }, "Image-to-video mode: using uploaded image");
    // Credit a small weight since we're skipping this step
    tracker.completeStep("keyframe").catch(() => {});
  } else {
    // Standard text-to-video: generate keyframe
    const imageWidth = data.aspectRatio === "9:16" ? 576 : 1024;
    const imageHeight = data.aspectRatio === "9:16" ? 1024 : 576;

    imageResult = await generateImage({
      prompt: enhancedPrompt,
      negativePrompt: data.negativePrompt,
      width: imageWidth,
      height: imageHeight,
    });
    inputImageUrl = imageResult.url;
  }
  await tracker.completeStep("keyframe");

  // Step 3: Generate video from keyframe/image
  let videoUrl = "";
  const duration = String(Math.min(data.durationSeconds, 10));

  try {
    const result = await generateVideo({
      imageUrl: inputImageUrl,
      prompt: enhancedPrompt,
      duration,
    });
    videoUrl = result.url;
  } catch {
    // Fallback to Replicate (CogVideoX)
    const result = await generateVideoFromImage({
      imageUrl: inputImageUrl,
      prompt: enhancedPrompt,
      duration: Math.min(data.durationSeconds, 10),
    });
    videoUrl = result.url;
  }
  await tracker.completeStep("video");

  // Step 4: Generate voiceover (ElevenLabs) — with language support
  let voiceoverUrl: string | undefined;
  let voiceoverDuration = 0;

  if (data.voiceover !== false && scriptForVoiceover) {
    try {
      // Use language-appropriate voice if available
      const voiceConfig: { voiceId?: string } = {};
      if (targetLang !== "en" && !data.voiceId) {
        const suggested = suggestVoiceForLanguage(targetLang);
        if (suggested.voiceId) voiceConfig.voiceId = suggested.voiceId;
      } else if (data.voiceId) {
        voiceConfig.voiceId = data.voiceId;
      }

      const voiceResult = await generateVoiceover(scriptForVoiceover, voiceConfig);
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

  // Step 6: Assemble final video — ASYNC via FFmpeg queue
  let finalVideoUrl = videoUrl;
  let actualDuration = data.durationSeconds;
  let thumbUrl = imageResult?.url || videoUrl;

  if (process.env.FFMPEG_PATH || process.env.NODE_ENV !== "production") {
    // Build captions once (used by both async and sync paths)
    const rawCaptions = data.captions !== undefined && data.captions.length > 0
      ? data.captions.map((c) => c)
      : toFFmpegDrawtext(generateCaptions(data.prompt, data.durationSeconds));

    const legacyCaptions = rawCaptions.length > 0
      ? rawCaptions
      : generateTimedCaptions(data.prompt, data.durationSeconds);

    try {
      // ── Enqueue to async FFmpeg queue instead of blocking ──
      await enqueueAssembly({
        jobId: data.jobId,
        userId: data.userId,
        plan: data.plan,
        videoUrl,
        voiceoverUrl,
        bgmUrl,
        captions: legacyCaptions.length > 0 ? legacyCaptions : undefined,
        watermark: data.watermark || "ReelMagic",
        prompt: data.prompt,
        durationSeconds: data.durationSeconds,
        aspectRatio: data.aspectRatio,
      });

      log.info({ jobId: data.jobId }, "FFmpeg assembly enqueued (async)");

      // Return immediately — FFmpeg will complete asynchronously
      // The ffmpeg-status endpoint can be polled for completion
      finalVideoUrl = videoUrl; // interim URL until FFmpeg finishes
      actualDuration = data.durationSeconds;
    } catch (err) {
      log.warn({ err }, "FFmpeg enqueue failed, trying synchronous assembly");

      // Fallback: run synchronously if queue fails
      try {
        const assemblyResult = await assembleVideo({
          videoUrl,
          voiceoverUrl,
          bgmUrl,
          captions: legacyCaptions.length > 0 ? legacyCaptions : undefined,
          watermark: data.watermark || "ReelMagic",
          width: data.aspectRatio === "9:16" ? 1080 : 1920,
          height: data.aspectRatio === "9:16" ? 1920 : 1080,
        });

        actualDuration = assemblyResult.durationSeconds;

        if (process.env.R2_ENDPOINT) {
          const { readFile: readFs } = await import("fs/promises");
          const buffer = await readFs(assemblyResult.outputPath);
          const vKey = videoKey(data.userId, data.jobId);
          finalVideoUrl = await uploadToR2(vKey, buffer, "video/mp4");

          try {
            const { unlink } = await import("fs/promises");
            await unlink(assemblyResult.outputPath);
          } catch { /* ignore */ }
        } else {
          finalVideoUrl = `file://${assemblyResult.outputPath}`;
        }
      } catch (syncErr) {
        log.warn({ err: syncErr }, "Sync FFmpeg also failed, using raw video");
        finalVideoUrl = videoUrl;
      }
    }
  }
  await tracker.completeStep("ffmpeg-queue");
  await tracker.completeStep("assemble");

  // Step 7: Upload raw video to R2 + extract thumbnail
  if (!finalVideoUrl.startsWith("file://") && process.env.R2_ENDPOINT) {
    // Upload raw video if assembly was skipped or using interim URL
    if (finalVideoUrl === videoUrl) {
      try {
        const vKey = videoKey(data.userId, data.jobId);
        finalVideoUrl = await uploadFromUrl(videoUrl, vKey, "video/mp4");
      } catch (err) {
        log.error({ err }, "R2 video upload failed");
      }
    }

    // Extract & upload thumbnail
    try {
      const thumbBuffer = await extractThumbnail(finalVideoUrl, "00:00:01");
      const tKey = thumbnailKey(data.userId, data.jobId);
      thumbUrl = await uploadToR2(tKey, thumbBuffer, "image/jpeg");
      log.debug({ jobId: data.jobId }, "Thumbnail extracted and uploaded");
    } catch (thumbErr) {
      log.warn({ err: thumbErr instanceof Error ? thumbErr.message : thumbErr },
        "Thumbnail extraction failed, using keyframe/interim as fallback");
      thumbUrl = imageResult?.url || finalVideoUrl;
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
