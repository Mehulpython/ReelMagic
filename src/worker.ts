#!/usr/bin/env npx tsx
// ─── ReelMagic Video Worker ─────────────────────────────────
// Standalone BullMQ worker process for video generation
// Run: npx tsx src/worker.ts
//
// Environment:
//   REDIS_URL          - Redis connection (required)
//   FAL_KEY            - fal.AI API key (image + video gen)
//   REPLICATE_API_TOKEN - Replicate API key (fallback video)
//   ELEVENLABS_API_KEY  - ElevenLabs TTS (voiceover)
//   SUNO_API_KEY        - Suno AI (BGM)
//   R2_ENDPOINT         - Cloudflare R2 endpoint
//   R2_ACCESS_KEY_ID    - R2 access key
//   R2_SECRET_ACCESS_KEY - R2 secret key
//   R2_BUCKET           - R2 bucket name

import { startVideoWorker } from "./lib/worker";

// ─── Graceful shutdown ───────────────────────────────────────

const worker = startVideoWorker(
  parseInt(process.env.WORKER_CONCURRENCY || "3", 10)
);

async function shutdown(signal: string) {
  console.log(`\n🛑 Received ${signal}, shutting down worker...`);
  await worker.close();
  console.log("✅ Worker shut down gracefully");
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// ─── Health check ────────────────────────────────────────────

setInterval(() => {
  const mem = process.memoryUsage();
  console.log(
    `💓 Worker alive | RSS: ${(mem.rss / 1024 / 1024).toFixed(0)}MB | Heap: ${(mem.heapUsed / 1024 / 1024).toFixed(0)}MB/${(mem.heapTotal / 1024 / 1024).toFixed(0)}MB`
  );
}, 60000); // Log every minute
