import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const log = logger.child({ endpoint: "health" });

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Check Redis connectivity (non-blocking)
    let redisOk = true;
    try {
      const { redis } = await import("@/lib/redis");
      await redis.ping();
    } catch {
      redisOk = false;
    }

    if (!redisOk) {
      return NextResponse.json({ status: "degraded" }, { status: 503 });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, "Health check failed");
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
