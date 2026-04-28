"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Film, ChevronLeft, ChevronRight, Filter, Loader2, Video } from "lucide-react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────

interface VideoJob {
  id: string;
  prompt: string | null;
  template_id: string | null;
  style: string | null;
  duration_seconds: number;
  aspect_ratio: string;
  status: string;
  progress: number;
  output_url: string | null;
  thumbnail_url: string | null;
  cost_cents: number | null;
  error_message: string | null;
  generation_model: string | null;
  created_at: string;
  completed_at: string | null;
}

// ─── Status Badge ────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    completed: { label: "✅ Complete", color: "text-green-400" },
    failed: { label: "❌ Failed", color: "text-red-400" },
    processing: { label: "🔄 Processing", color: "text-blue-400" },
    queued: { label: "⏳ Queued", color: "text-yellow-400" },
    cancelled: { label: "🚫 Cancelled", color: "text-gray-400" },
  };
  const s = map[status] || map.queued;
  return <span className={s.color}>{s.label}</span>;
}

// ─── Page ────────────────────────────────────────────────────

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoJob[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/user/videos?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setVideos(data.videos ?? []);
      setTotalPages(data.pagination?.totalPages ?? 1);
      setTotal(data.pagination?.total ?? 0);
    } catch (err) {
      console.error("Failed to fetch videos:", err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Video <span className="gradient-text">History</span>
          </h1>
          <p className="mt-1 text-sm text-gray-400">{total} videos total</p>
        </div>
        <Link href="/dashboard" className="btn-secondary text-sm">← Back to Dashboard</Link>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center gap-3">
        <Filter className="h-4 w-4 text-gray-500" />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input-dark text-sm"
        >
          <option value="">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="processing">Processing</option>
          <option value="failed">Failed</option>
          <option value="queued">Queued</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
        </div>
      ) : videos.length === 0 ? (
        /* Empty */
        <div className="glass-card py-16 text-center">
          <Video className="mx-auto mb-3 h-12 w-12 text-gray-600" />
          <p className="text-gray-400">No videos found</p>
        </div>
      ) : (
        /* Grid */
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card overflow-hidden group"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-black/40 flex items-center justify-center overflow-hidden">
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt={video.prompt ?? ""}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : video.output_url ? (
                    <video src={video.output_url} className="h-full w-full object-contain" muted />
                  ) : (
                    <Film className="h-10 w-10 text-gray-700" />
                  )}
                  {video.output_url && (
                    <a
                      href={video.output_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity"
                    >
                      <Film className="h-8 w-8 text-white" />
                    </a>
                  )}
                  <div className="absolute top-2 right-2 text-xs">
                    <StatusBadge status={video.status} />
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 space-y-2">
                  <p className="text-sm text-gray-300 line-clamp-2">{video.prompt || "Untitled"}</p>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{new Date(video.created_at).toLocaleDateString()}</span>
                    <span>{video.duration_seconds}s · {video.aspect_ratio}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">
                      {video.generation_model || "unknown"} · {video.style || "default"}
                    </span>
                    {video.cost_cents != null && (
                      <span className="font-medium text-white">${(video.cost_cents / 100).toFixed(2)}</span>
                    )}
                  </div>

                  {video.error_message && (
                    <p className="text-xs text-red-400 bg-red-500/5 rounded p-2">{video.error_message}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-400 hover:bg-white/5 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-400 hover:bg-white/5 disabled:opacity-30"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
