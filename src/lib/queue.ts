import { Queue, type Job } from "bullmq";
import { redis } from "./redis";

// ─── Job Data Types ──────────────────────────────────────────

export interface VideoJobData {
  jobId: string;
  userId: string;
  plan: string;
  prompt: string;
  templateId?: string;
  style?: string;
  durationSeconds: number;
  aspectRatio: string;
  inputImageUrl?: string;
  negativePrompt?: string;
  model?: string;
  voiceover?: boolean;
  voiceId?: string;
  bgm?: boolean;
  captions?: string[];
  watermark?: string;
  /** Generation mode — default is text-to-video */
  mode?: "text-to-video" | "image-to-video";
  /** Target language for script/voiceover (default: "en") */
  language?: string;
}

export interface VideoJobResult {
  outputUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
  costCents: number;
  model: string;
}

// ─── Plan Priority Mapping ───────────────────────────────────

const PLAN_PRIORITY: Record<string, number> = {
  enterprise: 1,
  pro: 10,
  starter: 50,
  free: 100,
};

// ─── Queue Instance ──────────────────────────────────────────

export const videoQueue = new Queue<VideoJobData, VideoJobResult>(
  "video-generation",
  {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 500 },
    },
  }
);

// ─── Queue Helpers ───────────────────────────────────────────

export async function addVideoJob(data: VideoJobData): Promise<string> {
  const job = await videoQueue.add(`generate:${data.jobId}`, data, {
    priority: PLAN_PRIORITY[data.plan] || 100,
    jobId: data.jobId,
  });
  return job.id!;
}

export async function getQueueJobStatus(jobId: string) {
  const job: Job<VideoJobData, VideoJobResult> | undefined =
    await videoQueue.getJob(jobId);

  if (!job) return null;

  const state = await job.getState();

  return {
    id: job.id,
    status: state,
    progress: job.progress as number,
    data: job.data,
    result: job.returnvalue,
    error: job.failedReason,
    attemptsMade: job.attemptsMade,
    timestamp: job.timestamp,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
  };
}

export async function cancelVideoJob(jobId: string): Promise<boolean> {
  const job = await videoQueue.getJob(jobId);
  if (!job) return false;

  const state = await job.getState();
  if (state === "waiting" || state === "delayed") {
    await job.remove();
    return true;
  }
  return false;
}

export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    videoQueue.getWaitingCount(),
    videoQueue.getActiveCount(),
    videoQueue.getCompletedCount(),
    videoQueue.getFailedCount(),
    videoQueue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed, total: waiting + active + delayed };
}
