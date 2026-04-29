// ─── Async FFmpeg Processing Queue ───────────────────────────
// Offloads FFmpeg assembly from the main worker so video generation
// can return immediately after AI steps complete. Uses a dedicated
// BullMQ queue with its own worker.

import { Queue, Worker, type Job } from "bullmq";
import { redis } from "./redis";
import { assembleVideo, extractThumbnail, generateTimedCaptions } from "./ffmpeg";
import { uploadToR2, videoKey, thumbnailKey } from "./storage";
import { createServerClient } from "./supabase";
import { logger } from "./logger";

const log = logger.child({ module: "ffmpeg-queue" });

// ─── Types ────────────────────────────────────────────────────

export interface FfmpegAssemblyJobData {
  jobId: string;
  userId: string;
  plan: string;
  videoUrl: string;           // raw AI-generated video URL
  voiceoverUrl?: string;
  bgmUrl?: string;
  captions?: string[];
  watermark?: string;
  prompt?: string;            // for fallback caption generation
  durationSeconds: number;
  aspectRatio: string;
}

export interface FfmpegAssemblyResult {
  outputUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
  fileSizeBytes: number;
}

// ─── Priority by Plan ────────────────────────────────────────

const PLAN_FFMPEG_PRIORITY: Record<string, number> = {
  enterprise: 1,
  pro: 10,
  starter: 50,
  free: 100,
};

// ─── Queue Instance ──────────────────────────────────────────

export const ffmpegQueue = new Queue<FfmpegAssemblyJobData, FfmpegAssemblyResult>(
  "ffmpeg-jobs",
  {
    connection: redis,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "exponential", delay: 3000 },
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 200 },
    },
  }
);

// ─── Enqueue ─────────────────────────────────────────────────

export async function enqueueAssembly(
  data: FfmpegAssemblyJobData
): Promise<string> {
  const job = await ffmpegQueue.add(`ffmpeg:${data.jobId}`, data, {
    jobId: `ffmpeg-${data.jobId}`,
    priority: PLAN_FFMPEG_PRIORITY[data.plan] || 100,
  });

  log.info({ jobId: data.jobId, ffJobId: job.id }, "FFmpeg assembly queued");
  return job.id!;
}

// ─── Status Check ────────────────────────────────────────────

export async function getFfmpegJobStatus(jobId: string) {
  const id = `ffmpeg-${jobId}`;
  const job = await ffmpegQueue.getJob(id);
  if (!job) return null;

  const state = await job.getState();
  return {
    id: job.id,
    status: state,
    progress: job.progress as number,
    error: job.failedReason,
    result: job.returnvalue as FfmpegAssemblyResult | null,
  };
}

// ─── Worker Processor ────────────────────────────────────────

async function processFfmpegJob(
  job: Job<FfmpegAssemblyJobData, FfmpegAssemblyResult>
): Promise<FfmpegAssemblyResult> {
  const { jobId, userId, videoUrl, voiceoverUrl, bgmUrl, captions, watermark, prompt, durationSeconds, aspectRatio } = job.data;

  log.info({ jobId }, "FFmpeg assembly started");
  await job.updateProgress(10);

  // Build captions if not provided
  const rawCaptions = (captions && captions.length > 0)
    ? captions
    : prompt
      ? generateTimedCaptions(prompt, durationSeconds)
      : [];

  // Determine output resolution
  const width = aspectRatio === "9:16" ? 1080 : aspectRatio === "1:1" ? 1080 : 1920;
  const height = aspectRatio === "9:16" ? 1920 : aspectRatio === "1:1" ? 1080 : 1080;

  await job.updateProgress(20);

  // Run FFmpeg assembly
  const assemblyResult = await assembleVideo({
    videoUrl,
    voiceoverUrl,
    bgmUrl,
    captions: rawCaptions.length > 0 ? rawCaptions : undefined,
    watermark: watermark || "ReelMagic",
    width,
    height,
  });

  await job.updateProgress(70);
  log.info({ jobId, size: assemblyResult.fileSizeBytes }, "FFmpeg assembly complete");

  // Upload assembled video to R2
  let finalVideoUrl: string;
  try {
    const { readFile: readFs } = await import("fs/promises");
    const buffer = await readFs(assemblyResult.outputPath);
    const vKey = videoKey(userId, jobId);
    finalVideoUrl = await uploadToR2(vKey, buffer, "video/mp4");

    // Cleanup temp file
    const { unlink } = await import("fs/promises");
    await unlink(assemblyResult.outputPath);

    log.debug({ jobId, key: vKey }, "Assembled video uploaded to R2");
  } catch (err) {
    log.error({ err, jobId }, "Failed to upload assembled video");
    throw new Error(`FFmpeg upload failed: ${err instanceof Error ? err.message : "unknown"}`);
  }

  await job.updateProgress(85);

  // Extract & upload thumbnail
  let thumbUrl: string;
  try {
    // Re-extract from the local file before it was deleted — use the uploaded URL
    const thumbBuffer = await extractThumbnail(finalVideoUrl, "00:00:01");
    const tKey = thumbnailKey(userId, jobId);
    thumbUrl = await uploadToR2(tKey, thumbBuffer, "image/jpeg");
  } catch (thumbErr) {
    log.warn({ err: thumbErr, jobId }, "Thumbnail extraction failed, using video URL as fallback");
    thumbUrl = finalVideoUrl; // will be handled gracefully downstream
  }

  await job.updateProgress(95);

  // Update Supabase video_job row
  try {
    const supabase = createServerClient();
    await supabase
      .from("video_jobs")
      .update({
        status: "completed",
        output_url: finalVideoUrl,
        thumbnail_url: thumbUrl,
        progress: 100,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    log.info({ jobId }, "Supabase updated after FFmpeg assembly");
  } catch (dbErr) {
    log.error({ err: dbErr, jobId }, "Failed to update Supabase after FFmpeg — data is consistent in R2 but DB may be stale");
  }

  await job.updateProgress(100);

  return {
    outputUrl: finalVideoUrl,
    thumbnailUrl: thumbUrl,
    durationSeconds: assemblyResult.durationSeconds,
    fileSizeBytes: assemblyResult.fileSizeBytes,
  };
}

// ─── Worker Factory ──────────────────────────────────────────

export function startFfmpegWorker(concurrency = 2) {
  const worker = new Worker<FfmpegAssemblyJobData, FfmpegAssemblyResult>(
    "ffmpeg-jobs",
    processFfmpegJob,
    {
      connection: redis,
      concurrency,
    }
  );

  worker.on("completed", (job) => {
    log.info({ jobId: job.data.jobId }, "FFmpeg job completed");
  });

  worker.on("failed", (job, err) => {
    log.error({ jobId: job?.data?.jobId, err: err.message }, "FFmpeg job failed");

    // Mark the video job as failed in Supabase
    if (job?.data?.jobId) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      createServerClient()
        .from("video_jobs")
        .update({
          status: "failed",
          error_message: `FFmpeg assembly failed: ${err.message}`,
        })
        .eq("id", job.data.jobId)
        .then(undefined, (dbErr: unknown) =>
          log.error({ err: dbErr, jobId: job.data.jobId }, "Failed to mark FFmpeg failure in DB")
        );
    }
  });

  worker.on("error", (err) => {
    log.error({ err: err.message }, "FFmpeg worker error");
  });

  log.info({ concurrency }, "FFmpeg worker started");
  return worker;
}
