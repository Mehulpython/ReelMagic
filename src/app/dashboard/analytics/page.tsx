"use client";

// ─── Analytics Dashboard ─────────────────────────────────────
// Shows aggregated metrics: views, completion rate, cost trends,
// top templates, and conversion funnel.

import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import { useVideoTracking } from "@/components/AnalyticsTracker";

// ─── Types ───────────────────────────────────────────────────

interface AnalyticsData {
  totalEvents: number;
  uniqueSessions: number;
  eventsByType: Record<string, number>;
  dailyCounts: Array<{ date: string; count: number }>;
  topUrls: Array<{ url: string; count: number }>;
}

interface FunnelData {
  steps: Array<{ name: string; event: string; count: number; percentage: number }>;
  totalEntries: number;
}

type DateRange = "7d" | "30d" | "90d" | "all";

const DATE_RANGE_CONFIG: Record<DateRange, { label: string; days?: number }> = {
  "7d": { label: "Last 7 Days", days: 7 },
  "30d": { label: "Last 30 Days", days: 30 },
  "90d": { label: "Last 90 Days", days: 90 },
  all: { label: "All Time" },
};

// ─── Colors ──────────────────────────────────────────────────

const COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

// ─── Component ──────────────────────────────────────────────

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [range, setRange] = useState<DateRange>("30d");
  const [loading, setLoading] = useState(true);

  // Video tracking for any embedded video previews
  useVideoTracking();

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (DATE_RANGE_CONFIG[range].days) {
        const start = new Date();
        start.setDate(start.getDate() - DATE_RANGE_CONFIG[range].days!);
        params.set("start", start.toISOString());
      }

      const [analyticsRes, funnelRes] = await Promise.all([
        fetch(`/api/analytics?${params}`),
        fetch(`/api/analytics?${params}&type=template:view&type=generation:start&type=generation:complete&type=share:click`),
      ]);

      if (analyticsRes.ok) {
        setData(await analyticsRes.json());
      }

      // Build funnel from analytics data
      if (funnelRes.ok) {
        const funnelData = await funnelRes.json();
        const steps = [
          { name: "Template Views", event: "template:view", count: 0, percentage: 100 },
          { name: "Generations Started", event: "generation:start", count: 0, percentage: 0 },
          { name: "Generations Completed", event: "generation:complete", count: 0, percentage: 0 },
          { name: "Shares", event: "share:click", count: 0, percentage: 0 },
        ];

        steps.forEach((step) => {
          step.count = funnelData.eventsByType[step.event] || 0;
          step.percentage = steps[0].count > 0
            ? Math.round((step.count / steps[0].count) * 100)
            : 0;
        });

        setFunnel({ steps, totalEntries: steps[0].count });
      }
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white p-6">
      <AnalyticsTracker pageName="dashboard-analytics" />

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <h1 className="text-3xl font-bold mb-2">📊 Analytics</h1>
        <p className="text-gray-400">Track your video performance and audience engagement.</p>
      </div>

      {/* Date Range Selector */}
      <div className="max-w-7xl mx-auto mb-8 flex gap-2 flex-wrap">
        {(Object.keys(DATE_RANGE_CONFIG) as DateRange[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              range === r
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            {DATE_RANGE_CONFIG[r].label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading analytics...</div>
      ) : data ? (
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
              title="Total Events"
              value={data.totalEvents.toLocaleString()}
              icon="📈"
            />
            <StatCard
              title="Unique Sessions"
              value={data.uniqueSessions.toLocaleString()}
              icon="👥"
            />
            <StatCard
              title="Video Views"
              value={(data.eventsByType["video:view"] || 0).toLocaleString()}
              icon="▶️"
            />
            <StatCard
              title="Completions"
              value={(data.eventsByType["video:complete"] || 0).toLocaleString()}
              icon="✅"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Activity Over Time */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h2 className="text-lg font-semibold mb-4">Activity Over Time</h2>
              {data.dailyCounts.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={data.dailyCounts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      dataKey="date"
                      stroke="#888"
                      fontSize={12}
                      tickFormatter={(v) => v.slice(5)}
                    />
                    <YAxis stroke="#888" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1a1a2e",
                        border: "1px solid #333",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center py-10">No data yet</p>
              )}
            </div>

            {/* Event Type Breakdown */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h2 className="text-lg font-semibold mb-4">Event Breakdown</h2>
              {Object.keys(data.eventsByType).length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={Object.entries(data.eventsByType).map(([name, value]) => ({
                        name: name.replace(/:/g, " "),
                        value,
                      }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                      }
                    >
                      {Object.entries(data.eventsByType).map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1a1a2e",
                        border: "1px solid #333",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center py-10">No events recorded</p>
              )}
            </div>
          </div>

          {/* Conversion Funnel */}
          {funnel && (
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h2 className="text-lg font-semibold mb-6">🔄 Conversion Funnel</h2>
              <div className="space-y-4 max-w-2xl mx-auto">
                {funnel.steps.map((step, i) => (
                  <div key={step.event} className="flex items-center gap-4">
                    <div className="w-32 text-sm text-gray-400 text-right font-medium">
                      {step.name}
                    </div>
                    <div className="flex-1 bg-gray-800 rounded-full h-10 relative overflow-hidden">
                      <div
                        className="h-full rounded-full flex items-center justify-end pr-3 transition-all duration-500"
                        style={{
                          width: `${step.percentage}%`,
                          backgroundColor: COLORS[i % COLORS.length],
                          minWidth: step.count > 0 ? "60px" : undefined,
                        }}
                      >
                        <span className="text-xs font-bold text-white drop-shadow">
                          {step.count.toLocaleString()} ({step.percentage}%)
                        </span>
                      </div>
                    </div>
                    {i < funnel.steps.length - 1 && (
                      <div className="text-gray-500 text-sm">↓</div>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-center text-gray-500 text-sm mt-4">
                Total entries: {funnel.totalEntries.toLocaleString()}
              </p>
            </div>
          )}

          {/* Top Pages */}
          {data.topUrls.length > 0 && (
            <div className="bg-gray--Agent rounded-xl p-6 border border-gray-800">
              <h2 className="text-lg font-semibold mb-4">🔗 Top Pages</h2>
              <div className="space-y-2">
                {data.topUrls.slice(0, 10).map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="text-gray-500 w-6">{i + 1}.</span>
                    <span className="flex-1 truncate text-gray-300">{item.url}</span>
                    <span className="text-purple-400 font-mono">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-400">
          Failed to load analytics data.
        </div>
      )}
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-sm text-gray-400">{title}</span>
      </div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}
