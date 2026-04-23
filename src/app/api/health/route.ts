import { NextResponse } from "next/server";
import { getQueueStats } from "@/lib/queue";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getQueueStats();
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      queue: stats,
      version: "0.1.0",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { status: "degraded", error: message },
      { status: 503 }
    );
  }
}
