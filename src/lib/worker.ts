import { Worker, type Job } from "bullmq";
import { redis } from "./redis";
import type { VideoJobData, VideoJobResult } from "./queue";
import { generateImage, generateVideo } from "./fal";
import { generateVideoFromImage } from "./replicate";
import { withRetry, withFallback } from "./resilience";
import { logger } from "./logger";

const log = logger.child({ module: "worker" });

// ─── Pipeline Steps ──────────────────────────────────────────

async function stepGenerateKeyframe(
  job: Job<VideoJobData, VideoJobResult>,
  prompt: string,
  aspectRatio: string,
  negativePrompt?: string
): Promise<{ url: string; seed?: number }> {
  await job.updateProgress(20);

  const width = aspectRatio === "9:16" ? 576 : 1024;
  const height = aspectRatio === "9:16" ? 1024 : 576;

  // Retry image generation up to 2 times on transient failures
  const result = await withRetry(
    () => generateImage({
      prompt,
      negativePrompt,
      width,
      height,
      model: "fal-ai/flux/schnell",
    }),
    `keyframe/${job.id}`,
    { maxRetries: 2 }
  );

  await job.updateProgress(40);
  return result;
}

async function stepGenerateVideo(
  job: Job<VideoJobData, VideoJobResult>,
  imageUrl: string,
  prompt: string,
  durationSeconds: number
): Promise<{ url: string }> {
  await job.updateProgress(50);

  // Primary: fal.AI Kling → Fallback: Replicate CogVideoX
  // Each provider gets its own retry budget
  const { result: videoUrl, source } = await withFallback(
    // Primary: fal.AI Kling
    async () => {
      const r = await generateVideo({
        imageUrl,
        prompt,
        duration: String(Math.min(durationSeconds, 10)),
        model: "fal-ai/kling-video/v1/standard/image-to-video",
      });
      return r.url;
    },
    // Fallback: Replicate
    async () => {
      const r = await generateVideoFromImage({
        imageUrl,
        prompt,
        duration: Math.min(durationSeconds, 10),
      });
      return r.url;
    },
    `video/${job.id}`,
    { maxRetries: 2 }
  );

  log.info({ jobId: job.id, source }, "Video generation completed");

  await job.updateProgress(85);
  return { url: videoUrl };
}

// ─── Main Worker Processor ───────────────────────────────────

async function processVideoJob(
  job: Job<VideoJobData, VideoJobResult>
): Promise<VideoJobResult> {
  const { prompt, style, durationSeconds, aspectRatio, negativePrompt, model } = job.data;

  // Step 1: Build enhanced prompt
  await job.updateProgress(5);
  const enhancedPrompt = [
    style ? `${style} style.` : "",
    prompt,
    "cinematic lighting, high quality, 4k, professional",
  ]
    .filter(Boolean)
    .join(" ");

  // Step 2: Generate keyframe image (with retry)
  const imageResult = await stepGenerateKeyframe(
    job,
    enhancedPrompt,
    aspectRatio,
    negativePrompt
  );

  // Step 3: Animate image → video (with fallback + retry)
  const videoResult = await stepGenerateVideo(
    job,
    imageResult.url,
    enhancedPrompt,
    durationSeconds
  );

  // Step 4-8: Upload, finalize (handled by full pipeline in production)
  await job.updateProgress(95);
  await job.updateProgress(100);

  const costCents = calculateCost(durationSeconds, model);

  return {
    outputUrl: videoResult.url,
    thumbnailUrl: imageResult.url,
    durationSeconds,
    costCents,
    model: model || "kling-v1",
  };
}

// ─── Cost Calculation ───────────────────────────────────────

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

// ─── Worker Factory ──────────────────────────────────────────

export function startVideoWorker(concurrency = 3) {
  const worker = new Worker<VideoJobData, VideoJobResult>(
    "video-generation",
    processVideoJob,
    {
      connection: redis,
      concurrency,
    }
  );

  worker.on("completed", (job: Job<VideoJobData, VideoJobResult>) => {
    log.info({ jobId: job.id, outputUrl: job.returnvalue?.outputUrl }, "Job completed");
  });

  worker.on("failed", (job: Job<VideoJobData, VideoJobResult> | undefined, err: Error) => {
    log.error({ jobId: job?.id, err: err.message }, "Job failed");
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  worker.on("progress", (job: Job<VideoJobData, VideoJobResult>, progress: any) => {
    log.debug({ jobId: job.id, progress }, "Job progress");
  });

  worker.on("error", (err: Error) => {
    log.error({ err: err.message }, "Worker error");
  });

  log.info({ concurrency }, "Video worker started");
  return worker;
}

// Export processor for testing
export { processVideoJob };
