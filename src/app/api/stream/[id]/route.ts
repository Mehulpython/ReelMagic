import { NextRequest } from "next/server";
import { getQueueJobStatus } from "@/lib/queue";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Stream closed
        }
      };

      let lastProgress = -1;
      let lastStatus = "";
      let pollCount = 0;
      const maxPolls = 300; // ~10 minutes at 2s intervals

      const poll = async () => {
        try {
          const status = await getQueueJobStatus(id);

          if (!status) {
            send({ error: "Job not found", done: true });
            controller.close();
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
            pollCount >= maxPolls
          ) {
            controller.close();
            return;
          }

          pollCount++;
          setTimeout(poll, 2000);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          send({ error: message, done: true });
          controller.close();
        }
      };

      send({ jobId: id, status: "connecting", progress: 0, done: false });
      poll();
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
