// ─── POST /api/upload/image ─────────────────────────────────
// Accept image uploads for image-to-video mode.
// Validates: JPEG/PNG/WebP, max 10MB (plan-dependent), min 512x512.
// Uploads to R2 and returns URL.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { uploadToR2 } from "@/lib/storage";
import { logger } from "@/lib/logger";
import { randomUUID } from "crypto";

const log = logger.child({ endpoint: "upload-image" });

// ─── Config ──────────────────────────────────────────────────

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MAX_SIZE_BYTES: Record<string, number> = {
  free: 10 * 1024 * 1024,      // 10 MB
  starter: 10 * 1024 * 1024,    // 10 MB
  pro: 20 * 1024 * 1024,        // 20 MB
  enterprise: 50 * 1024 * 1024, // 50 MB
};

const MIN_DIMENSION = 512;

// ─── POST: Upload Image ──────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided. Use field name 'file'" },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP" },
        { status: 400 }
      );
    }

    // Determine max size based on plan (default to free tier)
    let maxSize = MAX_SIZE_BYTES.free;
    try {
      const { createServerClient } = await import("@/lib/supabase");
      const supabase = createServerClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan")
        .eq("clerk_id", userId)
        .single();

      if (profile?.plan && MAX_SIZE_BYTES[profile.plan]) {
        maxSize = MAX_SIZE_BYTES[profile.plan];
      }
    } catch {
      // Default to free tier size limit
    }

    // Validate file size
    if (file.size > maxSize) {
      const maxMB = Math.round(maxSize / (1024 * 1024));
      return NextResponse.json(
        { error: `File too large. Maximum size is ${maxMB}MB for your plan.` },
        { status: 400 }
      );
    }

    // Validate image dimensions
    const buffer = Buffer.from(await file.arrayBuffer());
    let width = 0;
    let height = 0;

    try {
      // Simple PNG dimension parsing (for MVP — use sharp in production)
      if (file.type === "image/png") {
        // IHDR chunk: width at offset 16 (4 bytes BE), height at offset 20
        if (buffer.length >= 24) {
          width = buffer.readUInt32BE(16);
          height = buffer.readUInt32BE(20);
        }
      } else if (file.type === "image/jpeg") {
        // JPEG SOF0 markers contain dimensions
        let offset = 2;
        while (offset < buffer.length - 8) {
          if (buffer[offset] !== 0xff) break;
          const marker = buffer[offset + 1];
          if (marker === 0xc0 || marker === 0xc2) {
            height = buffer.readUInt16BE(offset + 5);
            width = buffer.readUInt16BE(offset + 7);
            break;
          }
          const segLen = buffer.readUInt16BE(offset + 2);
          offset += 2 + segLen;
        }
      }
      // WebP: RIFF header, VP8 chunk has dimensions at specific offsets
      else if (file.type === "image/webp" && buffer.length > 30) {
        // VP8/VP8L/VP8X bitstream
        const isLossless = buffer[15] === 0x2f;
        if (!isLossless && buffer[16] === 0x56 && buffer[17] === 0x50 && buffer[18] === 0x38) {
          // VP8: width & height are 14-bit LE at offset 26-27 and 28-29
          width = (buffer[27] & 0x3f) << 8 | buffer[26];
          height = (buffer[29] & 0x3f) << 8 | buffer[28];
        }
      }
    } catch (dimErr) {
      log.warn({ err: dimErr }, "Could not read image dimensions");
    }

    if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
      return NextResponse.json(
        { error: `Image too small. Minimum resolution is ${MIN_DIMENSION}x${MIN_DIMENSION}px.` },
        { status: 400 }
      );
    }

    // Generate key and upload
    const ext = EXT_MAP[file.type] || "jpg";
    const uuid = randomUUID();
    const key = `uploads/${userId}/${uuid}.${ext}`;

    const url = await uploadToR2(key, buffer, file.type);

    log.info({ userId, key, width, height, size: file.size }, "Image uploaded");

    return NextResponse.json({
      url,
      key,
      width,
      height,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error({ err: message }, "Image upload failed");
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}
