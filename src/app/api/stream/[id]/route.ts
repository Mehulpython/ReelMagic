import { NextRequest } from "next/server";
import { getQueueJobStatus } from "@/lib/queue";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const log = logger.child({ endpoint: "stream" });

// ─── GET /api/stream/:id ─────────────────────────────────────
// SSE stream for real-time job progress.
// Falls back to polling if SSE drops. Cleans up on disconnect.

const MAX_POLLS = 300; // ~10 minutes at 2s intervals
const POLL_INTERVAL_MS = 2000;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const encoder = new TextEncoder();
  const jobId = id;

  // Track active timeouts for cleanup
  const activeTimers: NodeJS.Timeout[] = [];

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Stream closed — stop everything
          cleanup();
        }
      };

      const cleanup = () => {
        activeTimers.forEach((t) => clearTimeout(t));
        activeTimers.length = 0;
      };

      let lastProgress = -1;
      let lastStatus = "";
      let pollCount = 0;

      const poll = async () => {
        // Check if controller is still open
        try {
          controller.desiredSize;
        } catch {
          cleanup();
          return;
        }

        try {
          const status = await getQueueJobStatus(jobId);

          if (!status) {
            send({ error: "Job not found", done: true });
            controller.close();
            cleanup();
            return;
          }

          // Only send if something changed
          if (status.progress !== lastProgress || status.status !== lastStatus) {
            lastProgress = status.progress;
            lastStatus = status.status as string;

            send({
              jobId: status.id,
              status: status.status,
              progress: status.progress,
              result: status.result,
              error: status.error,
              done: status.status === "completed" || status.status === "failed",
            });
          }

          // Stop polling if terminal state
          if (
            status.status === "completed" ||
            status.status === "failed" ||
            pollCount >= MAX_POLLS
          ) {
            if (pollCount >= MAX_POLLS) {
              log.warn({ jobId }, "SSE stream timed out");
              send({ error: "Stream timed out", done: true });
            }
            controller.close();
            cleanup();
            return;
          }

          pollCount++;
          const timer = setTimeout(poll, POLL_INTERVAL_MS);
          activeTimers.push(timer);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          log.warn({ err: message, jobId }, "SSE poll error");
          send({ error: message, done: true });
          controller.close();
          cleanup();
        }
      };

      send({ jobId, status: "connecting", progress: 0, done: false });
      const initialTimer = setTimeout(poll, 500);
      activeTimers.push(initialTimer);
    },

    cancel() {
      // Client disconnected — clean up all pending timers
      activeTimers.forEach((t) => clearTimeout(t));
      log.debug({ jobId }, "SSE stream cancelled (client disconnect)");
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
