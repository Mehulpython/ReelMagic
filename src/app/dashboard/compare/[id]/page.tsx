"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, Video, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Variant {
  id: string;
  label: string;
  status?: string;
  outputUrl?: string | null;
  thumbnailUrl?: string | null;
}

export default function ComparePage() {
  const params = useParams();
  const abTestId = params.id as string;

  const [variants, setVariants] = useState<Variant[]>([
    { id: "", label: "A" },
    { id: "", label: "B" },
  ]);
  const [winner, setWinner] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Poll both jobs until complete
  useEffect(() => {
    if (!abTestId) return;

    const poll = async () => {
      try {
        // In a real implementation, we'd store the A→B job mapping
        // and look it up. For now, show the compare UI template.
        setLoading(false);
      } catch {
        setLoading(false);
      }
    };
    poll();
  }, [abTestId]);

  const pickWinner = (label: string) => {
    setWinner(label);
    // TODO: POST to /api/ab/:id/winner to record the choice
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Link href="/generate" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">
            A/B <span className="gradient-text">Compare</span>
          </h1>
          <p className="mt-1 text-sm text-gray-400">Pick the variant you prefer</p>
        </div>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {variants.map((v) => (
          <motion.div
            key={v.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: v.label === "A" ? 0 : 0.15 }}
            className={`glass-card overflow-hidden cursor-pointer transition-all duration-300 ${
              winner === v.label
                ? "ring-2 ring-purple-500 glow-border scale-[1.02]"
                : winner
                  ? "opacity-40"
                  : "hover:border-purple-500/30"
            }`}
            onClick={() => !winner && pickWinner(v.label)}
          >
            {/* Label badge */}
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-3 py-1 text-sm font-bold text-purple-300">
                Variant {v.label}
              </span>
              {winner === v.label && (
                <Trophy className="h-5 w-5 text-yellow-400" />
              )}
            </div>

            {/* Video preview */}
            <div className="aspect-video bg-black/40 flex items-center justify-center">
              {v.outputUrl ? (
                <video
                  src={v.outputUrl}
                  poster={v.thumbnailUrl || undefined}
                  controls
                  className="h-full w-full object-contain"
                  muted
                />
              ) : v.status === "processing" ? (
                <div className="flex flex-col items-center gap-2 text-gray-500">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                  <span className="text-sm">Generating variant {v.label}...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-600">
                  <Video className="h-10 w-10" />
                  <span className="text-sm">Waiting for video</span>
                </div>
              )}
            </div>

            {/* Pick button */}
            {!winner && (
              <div className="p-4 text-center">
                <span className="text-xs text-gray-500">Click to select</span>
              </div>
            )}

            {winner === v.label && (
              <div className="p-4 text-center bg-purple-500/10">
                <span className="text-sm font-semibold text-purple-300">🏆 Winner!</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Winner actions */}
      {winner && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-4"
        >
          <p className="text-sm text-gray-400">
            Variant <strong className="text-white">{winner}</strong> selected as winner.
          </p>
          <button
            onClick={() => setWinner(null)}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-400 hover:bg-white/5"
          >
            Re-compare
          </button>
          <Link
            href="/dashboard"
            className="btn-primary inline-flex items-center gap-2 text-sm"
          >
            Use This Video →
          </Link>
        </motion.div>
      )}
    </div>
  );
}
