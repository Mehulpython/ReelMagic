"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Clapperboard, Palette, Clock, Ratio, Mic, Music, Type,
  Upload, Globe, Image, X, ChevronDown, Sparkles, RefreshCw, Share2, Copy, Check,
} from "lucide-react";
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

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
];

const EXAMPLE_PROMPTS = [
  "15-second TikTok ad for a new energy drink targeting Gen Z with fast cuts and trending audio",
  "Cinematic product launch for wireless earbuds — sleek, minimal, premium feel",
  "Viral reaction meme video with bold text overlays and trending music",
  "30-second political ad with patriotic visuals and professional voiceover",
  "Dropshipping ad for a portable blender with urgency triggers and social proof",
];

const PIPELINE_LABELS: Record<string, string> = {
  analyze: "Analyzing script",
  keyframe: "Generating keyframe image",
  video: "Generating video (AI)",
  voiceover: "Recording voiceover",
  bgm: "Composing background music",
  assemble: "Assembling final video",
  "ffmpeg-queue": "Processing video (FFmpeg)",
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
  // Core form state
  const [script, setScript] = useState("");
  const [template, setTemplate] = useState("product-launch");
  const [style, setStyle] = useState("cinematic");
  const [duration, setDuration] = useState(15);
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9">("9:16");

  // Audio defaults
  const [voiceover, setVoiceover] = useState(true);
  const [bgm, setBgm] = useState(true);
  const [captions, setCaptions] = useState(true);
  const [language, setLanguage] = useState("en");

  // Advanced toggle
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Image upload
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mode = uploadedImage ? "image-to-video" : "text-to-video";

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

  // Post-generation actions
  const [copied, setCopied] = useState(false);
  const [showSuccessActions, setShowSuccessActions] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);

  // ── SSE Connection ──

  const connectSSE = useCallback((id: string) => {
    if (eventSourceRef.current) eventSourceRef.current.close();
    const es = new EventSource(`/api/stream/${id}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case "progress": {
            setProgress((prev) => {
              const stepLabel = PIPELINE_LABELS[data.step] || data.step || prev.currentStep;
              const steps = [...prev.steps];
              const existingIdx = steps.findIndex((s) => s.id === data.step);
              if (existingIdx >= 0) {
                steps[existingIdx] = { ...steps[existingIdx], done: true };
              } else {
                steps.push({ id: data.step, label: stepLabel, done: true });
              }
              return { percent: data.percent ?? prev.percent, currentStep: stepLabel, steps };
            });
            break;
          }
          case "complete": {
            setStatus("complete");
            setVideoUrl(data.outputUrl);
            setThumbnailUrl(data.thumbnailUrl);
            setShowSuccessActions(true);
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
      } catch {}
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      pollStatus(id);
    };
  }, []);

  const pollStatus = useCallback(async (id: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > 120) {
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
          setShowSuccessActions(true);
        } else if (data.status === "failed") {
          clearInterval(interval);
          setStatus("error");
          setError(data.error || "Generation failed");
        } else if (data.progress !== undefined) {
          setProgress((prev) => ({ ...prev, percent: data.progress, currentStep: data.currentStep || prev.currentStep }));
        }
      } catch {}
    }, 5000);
  }, []);

  // ── Image Upload ──

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setUploadError("JPEG, PNG, or WebP only");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setUploadError("File too large (max 20MB)");
      return;
    }
    setUploading(true);
    setUploadError(null);
    const previewUrl = URL.createObjectURL(file);
    setUploadedImage(previewUrl);
    setUploadedFile(file);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload/image", { method: "POST", body: formData });
      if (!res.ok) throw new Error((await res.json()).error || `Upload failed (${res.status})`);
      const data = await res.json();
      setUploadedImage(data.url);
      setUploadedFile(null);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      setUploadedImage(null);
      setUploadedFile(null);
    } finally {
      setUploading(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleImageUpload(file);
  }, [handleImageUpload]);

  const removeImage = () => {
    setUploadedImage(null);
    setUploadedFile(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Submit ──

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!script.trim() && !uploadedImage) return;
    setStatus("submitting");
    setError(null);
    setVideoUrl(null);
    setThumbnailUrl(null);
    setJobId(null);
    setShowSuccessActions(false);
    setProgress({ percent: 0, currentStep: "Submitting...", steps: [] });

    try {
      const body: Record<string, unknown> = {
        script: script.trim() || "Animate this image into a dynamic video ad",
        templateId: template,
        style,
        durationSeconds: duration,
        aspectRatio,
        voiceover,
        bgm,
        captions,
        language,
        mode,
      };
      if (uploadedImage && mode === "image-to-video") {
        body.inputImageUrl = uploadedImage;
      }
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
      const data = await res.json();
      setJobId(data.jobId);
      setStatus("generating");
      setProgress({ percent: 5, currentStep: "Job queued", steps: [] });
      connectSSE(data.jobId);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to submit");
    }
  };

  // ── Post-generation actions ──

  const handleCopyLink = async () => {
    if (!videoUrl) return;
    try {
      await navigator.clipboard.writeText(videoUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleShare = async () => {
    if (!videoUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Check out my AI-generated video!",
          text: "Made with ReelMagic 🎬",
          url: videoUrl,
        });
      } catch {}
    } else {
      handleCopyLink();
    }
  };

  const handleCreateAnother = () => {
    setStatus("idle");
    setJobId(null);
    setVideoUrl(null);
    setThumbnailUrl(null);
    setError(null);
    setShowSuccessActions(false);
    setProgress({ percent: 0, currentStep: "", steps: [] });
  };

  // ── Cancel / Reset ──

  const handleCancel = async () => {
    if (!jobId) return;
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      if ((await res.json()).success) handleReset();
    } catch {}
  };

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
    setUploadedImage(null);
    setUploadedFile(null);
    setUploadError(null);
    setShowSuccessActions(false);
  };

  const estimatedCost = (duration * 0.10).toFixed(2);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Left Panel — Form */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Script — Primary Input */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
              <Clapperboard className="h-4 w-4 text-purple-400" />
              Describe your video
            </label>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="e.g., '15-second TikTok ad for a new energy drink targeting Gen Z with fast cuts and trending audio'"
              rows={4}
              className="input-dark w-full resize-none"
              disabled={status === "generating"}
            />
            {/* Example prompts */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {EXAMPLE_PROMPTS.slice(0, 3).map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setScript(p)}
                  className="rounded-full bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1 text-[11px] text-gray-400 hover:text-white transition-colors"
                >
                  <Sparkles className="mr-1 inline h-2.5 w-2.5 text-purple-400" />
                  {p.slice(0, 40)}...
                </button>
              ))}
            </div>
          </div>

          {/* Template + Style — Quick Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-300">
                <Palette className="h-3.5 w-3.5 text-purple-400" />
                Template
              </label>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="input-dark w-full appearance-none cursor-pointer"
                disabled={status === "generating"}
              >
                {TEMPLATES.map((t) => (
                  <option key={t.value} value={t.value} className="bg-[#1a1a2e]">{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-300">
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                Style
              </label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="input-dark w-full appearance-none cursor-pointer"
                disabled={status === "generating"}
              >
                {STYLES.map((s) => (
                  <option key={s.value} value={s.value} className="bg-[#1a1a2e]">{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick toggles */}
          <div className="flex gap-2">
            <ToggleButton icon={<Mic className="h-3.5 w-3.5" />} label="Voice" active={voiceover} onClick={() => setVoiceover(!voiceover)} disabled={status === "generating"} />
            <ToggleButton icon={<Music className="h-3.5 w-3.5" />} label="Music" active={bgm} onClick={() => setBgm(!bgm)} disabled={status === "generating"} />
            <ToggleButton icon={<Type className="h-3.5 w-3.5" />} label="Captions" active={captions} onClick={() => setCaptions(!captions)} disabled={status === "generating"} />
          </div>

          {/* Advanced Options — Collapsed by Default */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
              {showAdvanced ? "Hide" : "Show"} advanced options
            </button>

            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-5 pt-4">
                    {/* Duration */}
                    <div>
                      <label className="mb-2 flex items-center justify-between text-sm font-medium text-gray-300">
                        <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-purple-400" /> Duration</span>
                        <span className="text-purple-400">{duration}s</span>
                      </label>
                      <input type="range" min={5} max={60} step={5} value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        className="w-full accent-purple-500" disabled={status === "generating"} />
                      <div className="mt-1 flex justify-between text-xs text-gray-600"><span>5s</span><span>60s</span></div>
                    </div>

                    {/* Aspect Ratio */}
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
                        <Ratio className="h-4 w-4 text-purple-400" /> Aspect Ratio
                      </label>
                      <div className="flex gap-3">
                        <RatioButton label="9:16" display="Vertical" active={aspectRatio === "9:16"} onClick={() => setAspectRatio("9:16")} disabled={status === "generating"} />
                        <RatioButton label="16:9" display="Landscape" active={aspectRatio === "16:9"} onClick={() => setAspectRatio("16:9")} disabled={status === "generating"} />
                      </div>
                    </div>

                    {/* Language */}
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
                        <Globe className="h-4 w-4 text-purple-400" /> Voiceover Language
                      </label>
                      <select value={language} onChange={(e) => setLanguage(e.target.value)}
                        className="input-dark w-full appearance-none cursor-pointer" disabled={status === "generating"}>
                        {LANGUAGES.map((l) => (
                          <option key={l.code} value={l.code} className="bg-[#1a1a2e]">{l.flag} {l.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Image Upload */}
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
                        <Image className="h-4 w-4 text-purple-400" /> Source Image (Optional — Image-to-Video)
                      </label>
                      {!uploadedImage ? (
                        <div
                          onDrop={handleDrop}
                          onDragOver={(e) => e.preventDefault()}
                          onClick={() => fileInputRef.current?.click()}
                          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 transition-colors ${
                            uploading ? "border-purple-400/50 bg-purple-500/5" : "border-gray-700 bg-white/[0.02] hover:border-purple-500/50 hover:bg-white/[0.04]"
                          }`}
                        >
                          {uploading ? (
                            <><LoadingSpinner size="sm" /><span className="text-sm text-gray-400">Uploading...</span></>
                          ) : (
                            <><Upload className="h-6 w-6 text-gray-600" /><span className="text-xs text-gray-400">Drag & drop or click to browse</span><span className="text-[10px] text-gray-600">JPEG, PNG, WebP · Max 20MB</span></>
                          )}
                          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
                            className="hidden" disabled={status === "generating" || uploading} />
                        </div>
                      ) : (
                        <div className="relative overflow-hidden rounded-xl border border-purple-500/30 bg-white/[0.02]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={uploadedImage} alt="Source" className="h-36 w-full object-contain" />
                          <button type="button" onClick={removeImage}
                            className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-gray-300 hover:bg-red-500/80 hover:text-white transition-colors">
                            <X className="h-4 w-4" />
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
                            <p className="text-xs text-purple-300">✨ Image-to-Video mode active</p>
                          </div>
                        </div>
                      )}
                      {uploadError && <p className="mt-1 text-xs text-red-400">{uploadError}</p>}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={status === "generating" || status === "submitting" || (!script.trim() && !uploadedImage)}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {status === "submitting" || status === "generating" ? (
                <><LoadingSpinner size="sm" />{status === "submitting" ? "Submitting..." : "Generating..."}</>
              ) : (
                <><Send className="h-4 w-4" /> Generate Video</>
              )}
            </button>
            {status !== "idle" && (
              <button type="button" onClick={handleReset} className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-gray-400 hover:bg-white/5">
                Reset
              </button>
            )}
          </div>

          <p className="text-center text-xs text-gray-600">
            Estimated cost: ~${estimatedCost} · <span className="text-purple-400">5 free videos/month</span>
          </p>
        </form>
      </motion.div>

      {/* Right Panel — Preview + Post-gen Actions */}
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
        <div className="sticky top-8 space-y-3">
          <VideoPreview
            status={status}
            videoUrl={videoUrl}
            thumbnailUrl={thumbnailUrl}
            jobId={jobId}
            progress={progress}
            error={error}
          />

          {/* Post-generation success actions */}
          <AnimatePresence>
            {showSuccessActions && status === "complete" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass-card p-4 space-y-3"
              >
                <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                  <Check className="h-4 w-4" /> Video ready!
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {videoUrl && (
                    <a href={videoUrl} download className="flex flex-col items-center gap-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 py-3 text-xs text-gray-300 transition-colors">
                      <Download className="h-4 w-4" /> Download
                    </a>
                  )}
                  <button onClick={handleShare} className="flex flex-col items-center gap-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 py-3 text-xs text-gray-300 transition-colors">
                    <Share2 className="h-4 w-4" /> Share
                  </button>
                  <button onClick={handleCopyLink} className="flex flex-col items-center gap-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 py-3 text-xs text-gray-300 transition-colors">
                    {copied ? <><Check className="h-4 w-4 text-green-400" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy Link</>}
                  </button>
                </div>
                <button onClick={handleCreateAnother} className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary-600/20 hover:bg-primary-600/30 border border-primary-500/30 py-2.5 text-sm text-primary-300 transition-colors">
                  <RefreshCw className="h-4 w-4" /> Create Another
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function ToggleButton({ icon, label, active, onClick, disabled }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200 ${
        active ? "bg-purple-600/20 border border-purple-500/50 text-purple-300" : "bg-white/5 border border-white/10 text-gray-500 hover:bg-white/10"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
      {icon}{label}
    </button>
  );
}

function RatioButton({ label, display, active, onClick, disabled }: { label: string; display: string; active: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
        active ? "bg-purple-600/20 border border-purple-500/50 text-purple-300" : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
      <div className="flex h-4 w-3 items-center justify-center rounded-sm border border-current"><span className="text-[7px]">{label}</span></div>
      {display}
    </button>
  );
}

function Download({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}
