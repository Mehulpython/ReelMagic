// ─── AI Caption Generation ──────────────────────────────────
// Generates timed SRT captions from voiceover scripts.
// Supports: sentence splitting, word-timing estimation, SRT output,
// and FFmpeg-compatible drawtext filter format.

// ─── Types ───────────────────────────────────────────────────

export interface TimedCaption {
  index: number;
  startTime: string;   // "00:00:01,500"
  endTime: string;     // "00:00:03,200"
  text: string;
}

export interface CaptionSegment {
  startSeconds: number;
  endSeconds: number;
  text: string;
}

// ─── Constants ───────────────────────────────────────────────

const WORDS_PER_SECOND = 2.5; // Average speaking rate
const MIN_CAPTION_DURATION = 1.5; // seconds
const MAX_CAPTION_DURATION = 6;  // seconds
const GAP_BETWEEN_CAPTIONS = 0.3; // seconds

// ─── Main: Generate Captions ─────────────────────────────────

/**
 * Generate timed captions from a script/prompt.
 * Distributes text evenly across the video duration with
 * natural sentence boundaries and speaking-rate timing.
 */
export function generateCaptions(
  script: string,
  totalDurationSeconds: number
): TimedCaption[] {
  const sentences = splitSentences(script);

  if (sentences.length === 0) return [];

  // Calculate total "weight" of all sentences (by word count)
  const wordCounts = sentences.map((s) => countWords(s));
  const totalWords = wordCounts.reduce((a, b) => a + b, 0);

  if (totalWords === 0) {
    // Single block of text — spread evenly
    return [{
      index: 1,
      startTime: formatSRTTime(0),
      endTime: formatSRTTime(totalDurationSeconds),
      text: script.trim(),
    }];
  }

  // Distribute time proportionally by word count
  const captions: TimedCaption[] = [];
  let currentTime = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();
    if (!sentence) continue;

    const words = wordCounts[i];
    // Proportional duration based on word count vs total
    let rawDuration = (words / totalWords) * totalDurationSeconds;
    // Clamp to min/max
    rawDuration = Math.max(MIN_CAPTION_DURATION, Math.min(MAX_CAPTION_DURATION, rawDuration));

    const startTime = currentTime;
    let endTime = currentTime + rawDuration;

    // Don't exceed video duration
    if (endTime > totalDurationSeconds) {
      endTime = totalDurationSeconds;
    }

    // Add gap between captions (except for last one)
    if (i < sentences.length - 1 && endTime + GAP_BETWEEN_CAPTIONS < totalDurationSeconds) {
      endTime -= GAP_BETWEEN_CAPTIONS;
    }

    captions.push({
      index: captions.length + 1,
      startTime: formatSRTTime(startTime),
      endTime: formatSRTTime(endTime),
      text: sentence,
    });

    currentTime = endTime + GAP_BETWEEN_CAPTIONS;
  }

  return captions;
}

// ─── Export as SRT File Content ──────────────────────────────

export function toSRT(captions: TimedCaption[]): string {
  const lines = captions.map((c) =>
    [
      String(c.index),
      `${c.startTime} --> ${c.endTime}`,
      c.text,
      "",
    ].join("\n")
  );
  return lines.join("\n");
}

// ─── Export for FFmpeg drawtext Filter ───────────────────────
// Returns array of "start:text" pairs for the existing FFmpeg assembler

export function toFFmpegDrawtext(
  captions: TimedCaption[]
): string[] {
  return captions.map((c) => {
    const start = parseSRTTime(c.startTime);
    return `${start.toFixed(1)}:${c.text}`;
  });
}

// ─── Export as Segments (for JSON / API responses) ───────────

export function toSegments(captions: TimedCaption[]): CaptionSegment[] {
  return captions.map((c) => ({
    startSeconds: parseSRTTime(c.startTime),
    endSeconds: parseSRTTime(c.endTime),
    text: c.text,
  }));
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

/** Split text into sentences on sentence-ending punctuation */
function splitSentences(text: string): string[] {
  // Split on . ! ? followed by space or end of string
  // But preserve decimal numbers like "9.99"
  return text
    .replace(/([.!?])\s+/g, "$1|")
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Count words in a string */
function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** Format seconds to SRT timestamp: "00:01:23,456" */
function formatSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

/** Parse SRT timestamp back to seconds */
function parseSRTTime(timeStr: string): number {
  // Handle both "," and "." as millisecond separator
  const cleaned = timeStr.replace(",", ".");
  const parts = cleaned.split(":");
  if (parts.length === 3) {
    const h = parseFloat(parts[0]) || 0;
    const m = parseFloat(parts[1]) || 0;
    const s = parseFloat(parts[2]) || 0;
    return h * 3600 + m * 60 + s;
  }
  return 0;
}
