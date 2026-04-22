"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Clapperboard, Palette, Clock, Ratio } from "lucide-react";
import { VideoPreview } from "./VideoPreview";
import { LoadingSpinner } from "./LoadingSpinner";

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

export function GenerateForm() {
  const [script, setScript] = useState("");
  const [template, setTemplate] = useState("product-launch");
  const [style, setStyle] = useState("cinematic");
  const [duration, setDuration] = useState(15);
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9">("9:16");
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setVideoUrl(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script,
          template,
          style,
          duration,
          aspectRatio,
        }),
      });

      const data = await res.json();
      setJobId(data.jobId);

      // TODO: Poll /api/status/[jobId] for completion
      // For now, simulate a delay
      setTimeout(() => {
        setVideoUrl(null); // Would be the actual video URL
        setIsGenerating(false);
      }, 10000);
    } catch (err) {
      console.error("Generation failed:", err);
      setIsGenerating(false);
    }
  };

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
              <Clapperboard className="h-4 w-4 text-primary-400" />
              Script / Description
            </label>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Describe your video ad... e.g., 'A 15-second TikTok ad for a new energy drink targeting Gen Z with fast cuts and trending audio'"
              rows={5}
              className="input-dark w-full resize-none"
              required
            />
          </div>

          {/* Template */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
              <Palette className="h-4 w-4 text-primary-400" />
              Template
            </label>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="input-dark w-full appearance-none cursor-pointer"
            >
              {TEMPLATES.map((t) => (
                <option key={t.value} value={t.value} className="bg-surface-dark text-white">
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Style */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
              <SparkleIcon className="h-4 w-4 text-primary-400" />
              Visual Style
            </label>
            <div className="grid grid-cols-3 gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStyle(s.value)}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    style === s.value
                      ? "bg-primary-600/20 border border-primary-500/50 text-primary-300"
                      : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-300"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration Slider */}
          <div>
            <label className="mb-2 flex items-center justify-between text-sm font-medium text-gray-300">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary-400" />
                Duration
              </span>
              <span className="text-primary-400">{duration}s</span>
            </label>
            <input
              type="range"
              min={5}
              max={60}
              step={5}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full accent-primary-500"
            />
            <div className="mt-1 flex justify-between text-xs text-gray-600">
              <span>5s</span>
              <span>60s</span>
            </div>
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
              <Ratio className="h-4 w-4 text-primary-400" />
              Aspect Ratio
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setAspectRatio("9:16")}
                className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
                  aspectRatio === "9:16"
                    ? "bg-primary-600/20 border border-primary-500/50 text-primary-300"
                    : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10"
                }`}
              >
                <div className="flex h-5 w-3 items-center justify-center rounded-sm border border-current">
                  <span className="text-[8px]">9:16</span>
                </div>
                Vertical
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio("16:9")}
                className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
                  aspectRatio === "16:9"
                    ? "bg-primary-600/20 border border-primary-500/50 text-primary-300"
                    : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10"
                }`}
              >
                <div className="flex h-3 w-5 items-center justify-center rounded-sm border border-current">
                  <span className="text-[8px]">16:9</span>
                </div>
                Landscape
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isGenerating || !script.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <LoadingSpinner size="sm" />
                Generating...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Generate Video
              </>
            )}
          </button>
        </form>
      </motion.div>

      {/* Right Panel — Preview */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <VideoPreview
          isGenerating={isGenerating}
          videoUrl={videoUrl}
          jobId={jobId}
        />
      </motion.div>
    </div>
  );
}

/** Small sparkle icon since lucide doesn't have one with this name */
function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" />
    </svg>
  );
}
