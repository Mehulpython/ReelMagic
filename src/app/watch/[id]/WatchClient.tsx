"use client";

import { motion } from "framer-motion";
import { Play, Share2, ExternalLink, Sparkles } from "lucide-react";
import Link from "next/link";

interface VideoData {
  id: string;
  prompt: string | null;
  style: string | null;
  duration_seconds: number;
  aspect_ratio: string;
  output_url: string | null;
  thumbnail_url: string | null;
  generation_model: string | null;
  created_at: string;
  profiles: { full_name: string | null } | null;
}

export default function WatchClient({
  videoId,
  initialData,
}: {
  videoId: string;
  initialData: VideoData;
}) {
  const video = initialData;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `AI Video — ${video.prompt?.slice(0, 50) || "ReelMagic"}`,
          text: `Check out this AI-generated video ad!`,
          url: window.location.href,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-transparent to-transparent" />

      <div className="relative mx-auto max-w-4xl px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-purple-400 transition-colors mb-4"
          >
            <Sparkles className="h-4 w-4" />
            Made with ReelMagic
          </Link>
          <h1 className="text-xl font-semibold text-white">
            {video.prompt?.slice(0, 120) || "Untitled Video"}
            {(video.prompt?.length ?? 0) > 120 && "..."}
          </h1>
          {video.profiles?.full_name && (
            <p className="mt-1 text-sm text-gray-500">
              by {video.profiles.full_name} ·{" "}
              {new Date(video.created_at).toLocaleDateString()}
            </p>
          )}
        </motion.div>

        {/* Video Player */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="glass-card overflow-hidden"
        >
          <div
            className="relative flex items-center justify-center bg-black"
            style={{ aspectRatio: video.aspect_ratio === "16:9" ? "16/9" : video.aspect_ratio === "1:1" ? "1/1" : "9/16" }}
          >
            {video.output_url ? (
              <video
                src={video.output_url}
                poster={video.thumbnail_url || undefined}
                controls
                autoPlay
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-gray-600">
                <Play className="h-12 w-12" />
                <span>Video not available</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Actions bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-6 py-4"
        >
          <div className="flex items-center gap-4 text-xs text-gray-500">
            {video.style && (
              <span className="rounded-full bg-purple-500/10 px-2.5 py-1 text-purple-300">
                {video.style}
              </span>
            )}
            <span>{video.duration_seconds}s</span>
            {video.generation_model && <span>via {video.generation_model}</span>}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-sm text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
            <Link
              href="/generate"
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-500 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" /> Create Your Own
            </Link>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-gray-600 mb-3">Create AI video ads like this in seconds</p>
          <Link
            href="/generate"
            className="btn-primary inline-flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Try ReelMagic Free →
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
