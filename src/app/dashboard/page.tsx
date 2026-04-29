"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Film, Coins, DollarSign, TrendingUp, RefreshCw,
  Video, Clock, CheckCircle, XCircle, Loader2,
  Share2, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// ─── Types ───────────────────────────────────────────────────

interface UserInfo {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  creditsRemaining: number;
  createdAt: string;
}

interface UserStats {
  videosThisMonth: number;
  totalVideos: number;
  creditsSpent: number;
  totalCostCents: number;
  avgCostPerVideo: number;
}

interface JobInfo {
  id: string;
  prompt: string | null;
  status: string;
  progress: number;
  output_url: string | null;
  thumbnail_url: string | null;
  cost_cents: number | null;
  duration_seconds: number;
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
  generation_model: string | null;
}

interface DashboardData {
  user: UserInfo;
  stats: UserStats;
  recentJobs: JobInfo[];
}

interface UsagePoint {
  date: string;
  videos: number;
  credits: number;
  costCents: number;
}

// ─── Components ──────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <div className="flex items-center gap-3">
        <div className={`rounded-xl p-2.5 ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
            {label}
          </p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {sub && <p className="text-xs text-gray-500">{sub}</p>}
        </div>
      </div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: React.ElementType; label: string }> = {
    completed: { color: "text-green-400 bg-green-500/10", icon: CheckCircle, label: "Complete" },
    failed: { color: "text-red-400 bg-red-500/10", icon: XCircle, label: "Failed" },
    processing: { color: "text-blue-400 bg-blue-500/10", icon: Loader2, label: "Processing" },
    queued: { color: "text-yellow-400 bg-yellow-500/10", icon: Clock, label: "Queued" },
    cancelled: { color: "text-gray-400 bg-gray-500/10", icon: XCircle, label: "Cancelled" },
  };

  const c = config[status] || config.queued;
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${c.color}`}>
      <Icon className="h-3 w-3" />
      {c.label}
    </span>
  );
}

function VideoCard({ job }: { job: JobInfo }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card overflow-hidden group"
    >
      {/* Thumbnail / Preview */}
      <div className="relative aspect-video bg-black/40 flex items-center justify-center overflow-hidden">
        {job.thumbnail_url ? (
          <img
            src={job.thumbnail_url}
            alt={job.prompt ?? "Video thumbnail"}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : job.output_url ? (
          <video src={job.output_url} className="h-full w-full object-contain" muted />
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-600">
            <Video className="h-8 w-8" />
            <span className="text-xs">No preview</span>
          </div>
        )}
        {/* Overlay on hover */}
        {job.output_url && (
          <a
            href={job.output_url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
              <Film className="h-6 w-6 text-white" />
            </div>
          </a>
        )}
        {/* Status badge */}
        <div className="absolute top-2 right-2">
          <StatusBadge status={job.status} />
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm text-gray-300 line-clamp-2 min-h-[2.5rem]">
          {job.prompt || "Untitled video"}
        </p>
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>{new Date(job.created_at).toLocaleDateString()}</span>
          <div className="flex items-center gap-2">
            <span>{job.duration_seconds}s</span>
            {job.cost_cents != null && (
              <span>${(job.cost_cents / 100).toFixed(2)}</span>
            )}
            {job.status === "completed" && job.id && (
              <a
                href={`/watch/${job.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 transition-colors"
                title="Share this video"
              >
                <Share2 className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Dashboard Page ──────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [usage, setUsage] = useState<UsagePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [userRes, usageRes] = await Promise.all([
        fetch("/api/user"),
        fetch("/api/user/usage?days=30"),
      ]);

      if (!userRes.ok) throw new Error(`User API: ${userRes.status}`);
      if (!usageRes.ok) throw new Error(`Usage API: ${usageRes.status}`);

      const userData = await userRes.json();
      const usageData = await usageRes.json();

      setData(userData);
      setUsage(usageData.data ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="py-20 text-center">
          <p className="text-red-400 mb-4">{error || "Failed to load dashboard"}</p>
          <button onClick={fetchData} className="btn-secondary inline-flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const { user, stats, recentJobs } = data;

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Dashboard{" "}
            <span className="gradient-text">{user.name?.split(" ")[0] || "Creator"}</span>
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            {user.email} · {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)} Plan
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/brand-kit"
            className="rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-400 hover:bg-white/5 transition-colors"
          >
            🎨 Brand Kit
          </Link>
          <Link
            href="/generate"
            className="btn-primary inline-flex items-center gap-2"
          >
            <Film className="h-4 w-4" /> New Video
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Coins}
          label="Credits Left"
          value={user.creditsRemaining}
          sub={`${stats.creditsSpent} spent`}
          color="bg-purple-600"
        />
        <StatCard
          icon={Film}
          label="Videos This Month"
          value={stats.videosThisMonth}
          sub={`${stats.totalVideos} total`}
          color="bg-blue-600"
        />
        <StatCard
          icon={DollarSign}
          label="Total Spend"
          value={`$${(stats.totalCostCents / 100).toFixed(2)}`}
          sub={stats.avgCostPerVideo ? `Avg $${(stats.avgCostPerVideo / 100).toFixed(2)}/video` : undefined}
          color="bg-emerald-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Success Rate"
          value={
            recentJobs.length > 0
              ? `${Math.round((recentJobs.filter((j) => j.status === "completed").length / recentJobs.length) * 100)}%`
              : "—"
          }
          sub={`${recentJobs.filter((j) => j.status === "completed").length}/${recentJobs.length} jobs`}
          color="bg-amber-600"
        />
      </div>

      {/* Usage Chart */}
      {usage.length > 0 && (
        <div className="mb-8 glass-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Activity (Last 30 Days)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={usage}>
                <defs>
                  <linearGradient id="colorVideos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  tickFormatter={(v) => v.slice(5)}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a2e",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#9ca3af" }}
                  formatter={(value) => [value, "Videos"]}
                />
                <Area
                  type="monotone"
                  dataKey="videos"
                  stroke="#a855f7"
                  strokeWidth={2}
                  fill="url(#colorVideos)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent Videos */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent Videos</h2>
          <Link href="/dashboard/videos" className="text-sm text-purple-400 hover:text-purple-300">
            View all →
          </Link>
        </div>

        {recentJobs.length === 0 ? (
          <div className="glass-card py-16 text-center">
            <Film className="mx-auto mb-3 h-12 w-12 text-gray-600" />
            <p className="text-gray-400">No videos yet</p>
            <p className="mt-1 text-sm text-gray-600">Create your first AI video ad!</p>
            <Link href="/generate" className="btn-primary mt-4 inline-flex items-center gap-2">
              Get Started
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {recentJobs.map((job) => (
              <VideoCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
