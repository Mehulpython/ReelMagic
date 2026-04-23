import { Worker, type Job } from "bullmq";
import { redis } from "./redis";
import type { VideoJobData, VideoJobResult } from "./queue";
import { generateImage, generateVideo } from "./fal";
import { generateVideoFromImage } from "./replicate";

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

  const result = await generateImage({
    prompt,
    negativePrompt,
    width,
    height,
    model: "fal-ai/flux/schnell",
  });

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

  // Try fal.AI first (Kling), fall back to Replicate
  let videoUrl = "";

  try {
    const result = await generateVideo({
      imageUrl,
      prompt,
      duration: String(Math.min(durationSeconds, 10)),
      model: "fal-ai/kling-video/v1/standard/image-to-video",
    });
    videoUrl = result.url;
  } catch {
    // Fallback to Replicate
    try {
      const result = await generateVideoFromImage({
        imageUrl,
        prompt,
        duration: Math.min(durationSeconds, 10),
      });
      videoUrl = result.url;
    } catch {
      throw new Error("All video generation providers failed");
    }
  }

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

  // Step 2: Generate keyframe image
  const imageResult = await stepGenerateKeyframe(
    job,
    enhancedPrompt,
    aspectRatio,
    negativePrompt
  );

  // Step 3: Animate image → video
  const videoResult = await stepGenerateVideo(
    job,
    imageResult.url,
    enhancedPrompt,
    durationSeconds
  );

  // Step 4: TODO - Upload to R2, generate thumbnail, add audio
  await job.updateProgress(95);

  // Step 5: Complete
  await job.updateProgress(100);

  const costCents = Math.round(durationSeconds * 10); // ~$0.10/sec

  return {
    outputUrl: videoResult.url,
    thumbnailUrl: imageResult.url,
    durationSeconds,
    costCents,
    model: model || "kling-v1",
  };
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
    console.log(`✅ Job ${job.id} completed — ${job.returnvalue?.outputUrl}`);
  });

  worker.on("failed", (job: Job<VideoJobData, VideoJobResult> | undefined, err: Error) => {
    console.error(`❌ Job ${job?.id} failed:`, err.message);
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  worker.on("progress", (job: Job<VideoJobData, VideoJobResult>, progress: any) => {
    console.log(`⏳ Job ${job.id} progress: ${progress}%`);
  });

  worker.on("error", (err: Error) => {
    console.error("Worker error:", err);
  });

  console.log(`🎬 Video worker started (concurrency: ${concurrency})`);
  return worker;
}

// Export processor for testing
export { processVideoJob };
