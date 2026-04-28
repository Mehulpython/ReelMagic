"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, Clapperboard, Palette, Clock, Ratio, Mic, Music, Type } from "lucide-react";
import { VideoPreview } from "./VideoPreview";
import { LoadingSpinner } from "./LoadingSpinner";

// ─── Config ──────────────────────────────────────────────────

const TEMPLATES = [
  { value: "skibidi-reaction", label: "Skibidi Reaction" },
  { value: "democrat-ad", label: "Democrat Ad" },
  { value: "product-launch", label: "Product Launch" },
  { value: "beauty-influencer", label: "Beauty Influencer" },
  { value: "political-meme", label: "Political Meme" },
  { value: "dropship-ad", label: "Dropship Ad" },
];

const STYLES = [
  { value: "cinematic", label: "🎬 Cinematic" },
  { value: "fast-paced", label: "⚡ Fast-Paced" },
  { value: "minimal", label: "✨ Minimal" },
  { value: "bold", label: "💥 Bold & Loud" },
  { value: "nostalgic", label: "📼 Nostalgic" },
  { value: "trendy", label: "🔥 Trendy" },
];

const PIPELINE_LABELS: Record<string, string> = {
  analyze: "Analyzing script",
  keyframe: "Generating keyframe image",
  video: "Generating video (AI)",
  voiceover: "Recording voiceover",
  bgm: "Composing background music",
  assemble: "Assembling final video",
  upload: "Uploading to CDN",
  finalize: "Finalizing",
};

type GenerationStatus = "idle" | "submitting" | "generating" | "complete" | "error";

interface ProgressState {
  percent: number;
  currentStep: string;
  steps: { id: string; label: string; done: boolean }[];
}

// ─── Component ───────────────────────────────────────────────

export function GenerateForm() {
  // Form state
  const [script, setScript] = useState("");
  const [template, setTemplate] = useState("product-launch");
  const [style, setStyle] = useState("cinematic");
  const [duration, setDuration] = useState(15);
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9">("9:16");
  const [voiceover, setVoiceover] = useState(true);
  const [bgm, setBgm] = useState(true);
  const [captions, setCaptions] = useState(true);

  // Generation state
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressState>({
    percent: 0,
    currentStep: "",
    steps: [],
  });

  const eventSourceRef = useRef<EventSource | null>(null);

  // ── SSE Connection ──

  const connectSSE = useCallback((id: string) => {
    // Close any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(`/api/stream/${id}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "progress": {
            setProgress((prev) => {
              const stepLabel = PIPELINE_LABELS[data.step] || data.step || prev.currentStep;
              // Mark completed steps
              const steps = [...prev.steps];
              const existingIdx = steps.findIndex((s) => s.id === data.step);
              if (existingIdx >= 0) {
                steps[existingIdx] = { ...steps[existingIdx], done: true };
              } else {
                steps.push({ id: data.step, label: stepLabel, done: true });
              }
              return {
                percent: data.percent ?? prev.percent,
                currentStep: stepLabel,
                steps,
              };
            });
            break;
          }

          case "complete": {
            setStatus("complete");
            setVideoUrl(data.outputUrl);
            setThumbnailUrl(data.thumbnailUrl);
            es.close();
            eventSourceRef.current = null;
            break;
          }

          case "error": {
            setStatus("error");
            setError(data.message || "Generation failed");
            es.close();
            eventSourceRef.current = null;
            break;
          }
        }
      } catch {
        // Ignore malformed SSE data
      }
    };

    es.onerror = () => {
      // SSE connection closed or errored — don't immediately fail
      // The job might still be processing; poll status as fallback
      es.close();
      eventSourceRef.current = null;
      pollStatus(id);
    };
  }, []);

  // ── Fallback polling ──

  const pollStatus = useCallback(async (id: string) => {
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes at 5s intervals

    const interval = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(interval);
        setStatus("error");
        setError("Generation timed out");
        return;
      }

      try {
        const res = await fetch(`/api/status/${id}`);
        const data = await res.json();

        if (data.status === "completed") {
          clearInterval(interval);
          setStatus("complete");
          setVideoUrl(data.result?.outputUrl);
          setThumbnailUrl(data.result?.thumbnailUrl);
        } else if (data.status === "failed") {
          clearInterval(interval);
          setStatus("error");
          setError(data.error || "Generation failed");
        } else if (data.progress !== undefined) {
          setProgress((prev) => ({
            ...prev,
            percent: data.progress,
            currentStep: data.currentStep || prev.currentStep,
          }));
        }
      } catch {
        // Continue polling on network errors
      }
    }, 5000);
  }, []);

  // ── Submit ──

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!script.trim()) return;

    setStatus("submitting");
    setError(null);
    setVideoUrl(null);
    setThumbnailUrl(null);
    setJobId(null);
    setProgress({ percent: 0, currentStep: "Submitting...", steps: [] });

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script,
          templateId: template,
          style,
          durationSeconds: duration,
          aspectRatio,
          voiceover,
          bgm,
          captions,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const id = data.jobId;
      setJobId(id);
      setStatus("generating");
      setProgress({ percent: 5, currentStep: "Job queued", steps: [] });

      // Connect SSE for real-time updates
      connectSSE(id);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to submit");
    }
  };

  // ── Cancel ──

  const handleCancel = async () => {
    if (!jobId) return;
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        handleReset();
      } else {
        setError(data.message || "Could not cancel job — it may already be processing");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed");
    }
  };

  // ── Reset ──

  const handleReset = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setStatus("idle");
    setJobId(null);
    setVideoUrl(null);
    setThumbnailUrl(null);
    setError(null);
    setProgress({ percent: 0, currentStep: "", steps: [] });
  };

  // ── Est. cost ──
  const estimatedCost = (duration * 0.10).toFixed(2);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Left Panel — Form */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Script */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
              <Clapperboard className="h-4 w-4 text-purple-400" />
              Script / Description
            </label>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Describe your video ad... e.g., 'A 15-second TikTok ad for a new energy drink targeting Gen Z with fast cuts and trending audio'"
              rows={5}
              className="input-dark w-full resize-none"
              required
              disabled={status === "generating"}
            />
          </div>

          {/* Template + Style row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
                <Palette className="h-4 w-4 text-purple-400" />
                Template
              </label>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="input-dark w-full appearance-none cursor-pointer"
                disabled={status === "generating"}
              >
                {TEMPLATES.map((t) => (
                  <option key={t.value} value={t.value} className="bg-[#1a1a2e] text-white">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
                <SparkleIcon className="h-4 w-4 text-purple-400" />
                Visual Style
              </label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="input-dark w-full appearance-none cursor-pointer"
                disabled={status === "generating"}
              >
                {STYLES.map((s) => (
                  <option key={s.value} value={s.value} className="bg-[#1a1a2e] text-white">
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Audio toggles */}
          <div className="flex gap-3">
            <ToggleButton
              icon={<Mic className="h-3.5 w-3.5" />}
              label="Voiceover"
              active={voiceover}
              onClick={() => setVoiceover(!voiceover)}
              disabled={status === "generating"}
            />
            <ToggleButton
              icon={<Music className="h-3.5 w-3.5" />}
              label="BGM"
              active={bgm}
              onClick={() => setBgm(!bgm)}
              disabled={status === "generating"}
            />
            <ToggleButton
              icon={<Type className="h-3.5 w-3.5" />}
              label="Captions"
              active={captions}
              onClick={() => setCaptions(!captions)}
              disabled={status === "generating"}
            />
          </div>

          {/* Duration Slider */}
          <div>
            <label className="mb-2 flex items-center justify-between text-sm font-medium text-gray-300">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-400" />
                Duration
              </span>
              <span className="text-purple-400">{duration}s</span>
            </label>
            <input
              type="range"
              min={5}
              max={60}
              step={5}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full accent-purple-500"
              disabled={status === "generating"}
            />
            <div className="mt-1 flex justify-between text-xs text-gray-600">
              <span>5s</span>
              <span>60s</span>
            </div>
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
              <Ratio className="h-4 w-4 text-purple-400" />
              Aspect Ratio
            </label>
            <div className="flex gap-3">
              <RatioButton
                label="9:16"
                display="Vertical"
                active={aspectRatio === "9:16"}
                onClick={() => setAspectRatio("9:16")}
                disabled={status === "generating"}
              />
              <RatioButton
                label="16:9"
                display="Landscape"
                active={aspectRatio === "16:9"}
                onClick={() => setAspectRatio("16:9")}
                disabled={status === "generating"}
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={status === "generating" || status === "submitting" || !script.trim()}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "submitting" || status === "generating" ? (
                <>
                  <LoadingSpinner size="sm" />
                  {status === "submitting" ? "Submitting..." : "Generating..."}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Generate Video
                </>
              )}
            </button>
            {status !== "idle" && (
              <div className="flex items-center gap-2">
                {status === "generating" && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    Cancel Job
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-gray-400 hover:bg-white/5"
                >
                  Reset
                </button>
              </div>
            )}
          </div>

          {/* Cost estimate */}
          <p className="text-xs text-gray-600 text-center">
            Estimated cost: ~${estimatedCost} ({duration}s × $0.10/s)
          </p>
        </form>
      </motion.div>

      {/* Right Panel — Preview */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <VideoPreview
          status={status}
          videoUrl={videoUrl}
          thumbnailUrl={thumbnailUrl}
          jobId={jobId}
          progress={progress}
          error={error}
        />
      </motion.div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function ToggleButton({
  icon,
  label,
  active,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200 ${
        active
          ? "bg-purple-600/20 border border-purple-500/50 text-purple-300"
          : "bg-white/5 border border-white/10 text-gray-500 hover:bg-white/10"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {icon}
      {label}
    </button>
  );
}

function RatioButton({
  label,
  display,
  active,
  onClick,
  disabled,
}: {
  label: string;
  display: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
        active
          ? "bg-purple-600/20 border border-purple-500/50 text-purple-300"
          : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <div className="flex h-4 w-3 items-center justify-center rounded-sm border border-current">
        <span className="text-[7px]">{label}</span>
      </div>
      {display}
    </button>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" />
    </svg>
  );
}
