"use client";

import { motion } from "framer-motion";
import { Play, Download, Loader2 } from "lucide-react";

interface VideoPreviewProps {
  isGenerating: boolean;
  videoUrl: string | null;
  jobId: string | null;
}

export function VideoPreview({ isGenerating, videoUrl, jobId }: VideoPreviewProps) {
  return (
    <div className="sticky top-8">
      <div className="glass-card glow-border overflow-hidden">
        {/* Preview area */}
        <div className="relative flex aspect-video items-center justify-center bg-black/40">
          {isGenerating ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4"
            >
              {/* Animated loader */}
              <div className="relative">
                <div className="h-20 w-20 animate-spin-slow rounded-full border-2 border-primary-500/20" />
                <div className="absolute inset-0 h-20 w-20 animate-spin-slow rounded-full border-t-2 border-primary-500" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-white">Generating your video...</p>
                <p className="mt-1 text-xs text-gray-500">This usually takes 30-90 seconds</p>
              </div>

              {/* Progress steps */}
              <div className="mt-2 space-y-1 text-left text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  Analyzing script
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary-500 animate-pulse" />
                  Generating visuals
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-gray-600" />
                  Rendering video
                </div>
              </div>
            </motion.div>
          ) : videoUrl ? (
            <div className="relative w-full h-full">
              {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
              <video
                src={videoUrl}
                controls
                className="h-full w-full object-contain"
                autoPlay
              />
            </div>
          ) : (
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
        {videoUrl && !isGenerating && (
          <div className="flex items-center justify-between border-t border-white/5 px-4 py-3">
            <span className="text-xs text-gray-500">Job: {jobId}</span>
            <a
              href={videoUrl}
              download
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600/20 px-3 py-1.5 text-xs font-medium text-primary-300 transition-colors hover:bg-primary-600/30"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
