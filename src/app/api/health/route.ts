import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const log = logger.child({ endpoint: "health" });

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Quick dependency checks
    const deps: Record<string, string> = {
      status: "ok",
      node: process.version,
      env: process.env.NODE_ENV ?? "unknown",
    };

    // Check Redis connectivity (non-blocking)
    try {
      const { redis } = await import("@/lib/redis");
      await redis.ping();
      deps.redis = "connected";
    } catch {
      deps.redis = "disconnected";
    }

    return NextResponse.json(deps);
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, "Health check failed");
    return NextResponse.json(
      { status: "error", message: "Health check failed" },
      { status: 503 }
    );
  }
}
