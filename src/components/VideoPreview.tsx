"use client";

import { motion } from "framer-motion";
import { Play, Download, Loader2, Check, AlertCircle, RotateCcw } from "lucide-react";

interface ProgressState {
  percent: number;
  currentStep: string;
  steps: { id: string; label: string; done: boolean }[];
}

interface VideoPreviewProps {
  status: "idle" | "submitting" | "generating" | "complete" | "error";
  videoUrl: string | null;
  thumbnailUrl: string | null;
  jobId: string | null;
  progress: ProgressState;
  error: string | null;
}

export function VideoPreview({
  status,
  videoUrl,
  thumbnailUrl,
  jobId,
  progress,
  error,
}: VideoPreviewProps) {
  return (
    <div className="sticky top-8">
      <div className="glass-card glow-border overflow-hidden">
        {/* Preview area */}
        <div className="relative flex aspect-video items-center justify-center bg-black/40">
          {/* ── Generating State ── */}
          {status === "submitting" || status === "generating" ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex w-full flex-col items-center gap-4 p-6"
            >
              {/* Spinner */}
              <div className="relative">
                <div className="h-20 w-20 animate-spin-slow rounded-full border-2 border-purple-500/20" />
                <div
                  className="absolute inset-0 h-20 w-20 animate-spin-slow rounded-full border-t-2 border-purple-500"
                  style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-purple-400">{progress.percent}%</span>
                </div>
              </div>

              {/* Current step */}
              <div className="text-center">
                <p className="text-sm font-medium text-white">{progress.currentStep}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {status === "submitting" ? "Starting job..." : "This usually takes 30-90 seconds"}
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full max-w-xs">
                <div className="h-1.5 rounded-full bg-white/5">
                  <motion.div
                    className="h-1.5 rounded-full bg-gradient-to-r from-purple-500 to-amber-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress.percent}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* Step tracker */}
              {progress.steps.length > 0 && (
                <div className="mt-2 w-full max-w-xs space-y-1">
                  {progress.steps.map((step, i) => (
                    <div key={step.id + i} className="flex items-center gap-2 text-xs">
                      {step.done ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Loader2 className="h-3 w-3 animate-spin text-purple-400" />
                      )}
                      <span className={step.done ? "text-gray-400" : "text-white"}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : status === "complete" && videoUrl ? (
            /* ── Complete State ── */
            <div className="relative w-full h-full">
              <video
                src={videoUrl}
                poster={thumbnailUrl || undefined}
                controls
                className="h-full w-full object-contain"
                autoPlay
              />
            </div>
          ) : status === "error" ? (
            /* ── Error State ── */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3 p-6 text-center"
            >
              <div className="rounded-full bg-red-500/10 p-4">
                <AlertCircle className="h-8 w-8 text-red-400" />
              </div>
              <p className="text-sm font-medium text-red-300">Generation Failed</p>
              <p className="text-xs text-gray-500 max-w-xs">{error || "Unknown error occurred"}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-gray-400 hover:bg-white/10"
              >
                <RotateCcw className="h-3 w-3" />
                Try Again
              </button>
            </motion.div>
          ) : (
            /* ── Idle State ── */
            <div className="flex flex-col items-center gap-3 text-gray-600">
              <div className="rounded-full bg-white/5 p-6">
                <Play className="h-10 w-10" />
              </div>
              <p className="text-sm">Your video preview will appear here</p>
              <p className="text-xs text-gray-700">Fill in the form and click Generate</p>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        {status === "complete" && videoUrl && (
          <div className="flex items-center justify-between border-t border-white/5 px-4 py-3">
            <span className="text-xs text-gray-500 font-mono">
              {jobId ? `Job: ${jobId.slice(0, 8)}...` : ""}
            </span>
            <a
              href={videoUrl}
              download
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600/20 px-3 py-1.5 text-xs font-medium text-purple-300 transition-colors hover:bg-purple-600/30"
            >
              <Download className="h-3.5 w-3.5" />
              Download MP4
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
