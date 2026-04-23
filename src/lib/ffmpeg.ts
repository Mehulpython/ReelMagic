// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpeg = require("fluent-ffmpeg");
import { tmpdir } from "os";
import { join } from "path";
import { writeFile, unlink, readFile } from "fs/promises";
import { randomUUID } from "crypto";

// ─── FFmpeg Assembly Pipeline ────────────────────────────────
// Stitches: background video + voiceover + BGM + text overlays

interface AssemblyInput {
  videoUrl: string;
  voiceoverUrl?: string;
  bgmUrl?: string;
  captions?: string[];         // timed captions ["0.0:Hello world", "2.5:Buy now"]
  watermark?: string;          // URL or text
  width?: number;
  height?: number;
  durationSeconds?: number;
}

interface AssemblyResult {
  outputPath: string;
  durationSeconds: number;
  fileSizeBytes: number;
}

// ─── Temp File Helpers ───────────────────────────────────────

async function downloadToTemp(url: string, ext: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${url} → ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  const path = join(tmpdir(), `reelmagic-${randomUUID()}.${ext}`);
  await writeFile(path, buffer);
  return path;
}

function tmpPath(ext: string): string {
  return join(tmpdir(), `reelmagic-out-${randomUUID()}.${ext}`);
}

// ─── Main Assembly ───────────────────────────────────────────

export async function assembleVideo(input: AssemblyInput): Promise<AssemblyResult> {
  const { videoUrl, voiceoverUrl, bgmUrl, captions, watermark, width = 1080, height = 1920 } = input;

  const tempFiles: string[] = [];
  const outputPath = tmpPath("mp4");

  try {
    // Download all remote assets to temp files
    const videoPath = await downloadToTemp(videoUrl, "mp4");
    tempFiles.push(videoPath);

    let voiceoverPath: string | undefined;
    if (voiceoverUrl) {
      voiceoverPath = await downloadToTemp(voiceoverUrl, "mp3");
      tempFiles.push(voiceoverPath);
    }

    let bgmPath: string | undefined;
    if (bgmUrl) {
      bgmPath = await downloadToTemp(bgmUrl, "mp3");
      tempFiles.push(bgmPath);
    }

    // Build complex filter graph
    const filterComplex: string[] = [];
    let inputStreamCount = 1; // video is always [0:v]
    let audioMixInputs: string[] = [];

    // ── Step 1: Scale & pad video to target resolution ──
    filterComplex.push(
      `[0:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
      `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1[video_scaled]`
    );

    // ── Step 2: Add captions (drawtext) ──
    let lastVideoLabel = "video_scaled";
    if (captions && captions.length > 0) {
      const drawtextFilters = captions.map((cap, i) => {
        const [time, text] = cap.split(":", 2);
        const escaped = text.replace(/'/g, "'\\''").replace(/:/g, "\\:");
        const nextLabel = i === captions.length - 1 ? "video_final" : `v${i}`;
        const start = parseFloat(time);
        const end = start + 3; // show each caption for 3s
        filterComplex.push(
          `[${lastVideoLabel}]drawtext=text='${escaped}':` +
          `fontcolor=white:fontsize=48:borderw=3:bordercolor=black:` +
          `x=(w-text_w)/2:y=h*0.8:` +
          `enable='between(t\\,${start}\\,${end})'[${nextLabel}]`
        );
        lastVideoLabel = nextLabel;
        return nextLabel;
      });
      // If only one caption, it already outputs video_final
      if (captions.length > 1) {
        const lastCapIdx = captions.length - 1;
        const lastDrawIdx = captions.length - 2;
        // Re-label the last drawtext to output video_final
        // (already handled in the loop for last item)
      }
    }

    // ── Step 3: Add watermark ──
    if (watermark) {
      filterComplex.push(
        `[${lastVideoLabel}]drawtext=text='${watermark.replace(/'/g, "'\\''")}'` +
        `:fontcolor=white@0.5:fontsize=24:x=10:y=10[video_final]`
      );
      lastVideoLabel = "video_final";
    }

    // If no captions or watermark, rename to video_final
    if (lastVideoLabel !== "video_final") {
      filterComplex.push(`[${lastVideoLabel}]copy[video_final]`);
    }

    // ── Step 4: Audio mixing ──
    // Voiceover on input [1:a] (if exists), BGM on [2:a] (if exists)
    if (voiceoverPath) {
      audioMixInputs.push(`[${inputStreamCount}:a]`);
      inputStreamCount++;
    }
    if (bgmPath) {
      // Lower BGM volume
      filterComplex.push(
        `[${inputStreamCount}:a]volume=0.3[bgm_low]`
      );
      audioMixInputs.push("[bgm_low]");
      inputStreamCount++;
    }

    // Mix audio tracks
    if (audioMixInputs.length === 2) {
      filterComplex.push(
        `${audioMixInputs[0]}${audioMixInputs[1]}amix=inputs=2:duration=longest[audio_final]`
      );
    } else if (audioMixInputs.length === 1) {
      filterComplex.push(
        `${audioMixInputs[0]}acopy[audio_final]`
      );
    }

    // ── Step 5: Map outputs ──
    const hasAudio = audioMixInputs.length > 0;

    // Build the command
    const command = ffmpeg(videoPath);

    if (voiceoverPath) command.input(voiceoverPath);
    if (bgmPath) command.input(bgmPath);

    command
      .complexFilter(filterComplex)
      .outputOption("-map", "[video_final]")
      .outputOption("-c:v", "libx264")
      .outputOption("-preset", "fast")
      .outputOption("-crf", "23")
      .outputOption("-pix_fmt", "yuv420p")
      .outputOption("-movflags", "+faststart")
      .outputOption("-r", "30");

    if (hasAudio) {
      command
        .outputOption("-map", "[audio_final]")
        .outputOption("-c:a", "aac")
        .outputOption("-b:a", "128k");
    }

    command.output(outputPath);

    // Execute
    await new Promise<void>((resolve, reject) => {
      command.on("end", () => resolve());
      command.on("error", (err: Error) => reject(new Error(`FFmpeg failed: ${err.message}`)));
      command.run();
    });

    // Read result
    const stat = await readFile(outputPath);
    const durationSeconds = await getVideoDuration(outputPath);

    return {
      outputPath,
      durationSeconds,
      fileSizeBytes: stat.length,
    };
  } finally {
    // Cleanup temp inputs (but NOT outputPath — caller handles it)
    for (const f of tempFiles) {
      try { await unlink(f); } catch { /* ignore */ }
    }
  }
}

// ─── Duration Helper ─────────────────────────────────────────

function getVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ffmpeg.ffprobe(filePath, (err: any, data: any) => {
      if (err) {
        // Fallback: estimate from file size
        resolve(10);
        return;
      }
      resolve(data.format?.duration ?? 10);
    });
  });
}

// ─── Generate Captions from Script ───────────────────────────

export function generateTimedCaptions(
  script: string,
  totalDurationSeconds: number
): string[] {
  const sentences = script
    .replace(/([.!?])\s+/g, "$1|")
    .split("|")
    .filter((s) => s.trim().length > 0);

  if (sentences.length === 0) return [];

  const perCaption = totalDurationSeconds / sentences.length;

  return sentences.map((sentence, i) => {
    const start = (i * perCaption).toFixed(1);
    return `${start}:${sentence.trim()}`;
  });
}

// ─── Create Silent Audio (fallback) ──────────────────────────

export async function createSilentAudio(
  durationSeconds: number
): Promise<string> {
  const outputPath = tmpPath("mp3");

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input("anullsrc=r=44100:cl=stereo")
      .inputFormat("lavfi")
      .duration(durationSeconds)
      .audioCodec("libmp3lame")
      .output(outputPath)
      .on("end", () => resolve(outputPath))
      .on("error", (err: Error) => reject(err))
      .run();
  });
}
