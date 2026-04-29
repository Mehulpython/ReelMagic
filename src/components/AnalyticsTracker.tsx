"use client";

// ─── AnalyticsTracker ────────────────────────────────────────
// Client component that auto-tracks page views, video engagement,
// and time-on-page. Batches events and sends to /api/analytics/events.

import { useEffect, useRef, useCallback } from "react";
import type { AnalyticsEventType } from "@/lib/analytics";

// ─── Config ──────────────────────────────────────────────────

const FLUSH_INTERVAL_MS = 5_000;
const MAX_BUFFER_SIZE = 20;

// Generate a session ID once per module load
const SESSION_ID =
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface PendingEvent {
  type: AnalyticsEventType;
  properties?: Record<string, unknown>;
}

// ─── Shared mutable buffer (module-level for cross-hook access) ─

let _buffer: PendingEvent[] = [];
let _flushTimer: ReturnType<typeof setInterval> | null = null;
let _flushFn: (() => Promise<void>) | null = null;

function setFlushContext(flush: () => Promise<void>, buffer: PendingEvent[]) {
  _flushFn = flush;
  _buffer = buffer;
}

// ─── Component ───────────────────────────────────────────────

export default function AnalyticsTracker({
  userId,
  pageName,
}: {
  userId?: string;
  pageName: string;
}) {
  const buffer = useRef<PendingEvent[]>([]);
  const flushTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pageEnteredAt = useRef(Date.now());
  const hasTrackedView = useRef(false);

  // Check privacy settings
  const doNotTrack =
    typeof navigator !== "undefined" &&
    (navigator.doNotTrack === "1" || (window as unknown as Record<string, unknown>).doNotTrack === "true");
  const isTrackingEnabled = !doNotTrack;

  const flush = useCallback(async () => {
    if (!isTrackingEnabled || buffer.current.length === 0) return;

    const batch = [...buffer.current];
    buffer.current = [];

    try {
      await fetch("/api/analytics/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          batch.map((e) => ({
            ...e,
            sessionId: SESSION_ID,
            url: typeof window !== "undefined" ? window.location.href : undefined,
            userId,
          }))
        ),
      });
    } catch {
      // Silently fail — analytics should never break UX
    }
  }, [userId, isTrackingEnabled]);

  // Share flush context with useVideoTracking hook
  useEffect(() => {
    setFlushContext(() => flush(), buffer.current);
    return () => { setFlushContext(() => Promise.resolve(), []); };
  }, [flush]);

  // Track event (adds to buffer)
  const track = useCallback(
    (type: AnalyticsEventType, properties?: Record<string, unknown>) => {
      if (!isTrackingEnabled) return;

      buffer.current.push({ type, properties });

      if (buffer.current.length >= MAX_BUFFER_SIZE) {
        flush();
      }
    },
    [flush, isTrackingEnabled]
  );

  // ── Auto-flush timer ──
  useEffect(() => {
    flushTimer.current = setInterval(flush, FLUSH_INTERVAL_MS);
    return () => {
      if (flushTimer.current) clearInterval(flushTimer.current);
      flush(); // Flush remaining on unmount
    };
  }, [flush]);

  // ── Page view tracking on mount ──
  useEffect(() => {
    if (!hasTrackedView.current) {
      track("page:view", { page: pageName });
      hasTrackedView.current = true;
    }
  }, [pageName, track]);

  // ── Visibility change (track time on page) ──
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        const timeOnPage = Math.round((Date.now() - pageEnteredAt.current) / 1000);
        track("page:view", { page: pageName, timeOnPageSeconds: timeOnPage, action: "leave" });
      } else {
        pageEnteredAt.current = Date.now();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [pageName, track]);

  // This component renders nothing — it's purely for side effects
  return null;
}

// ─── Video Event Tracker Hook ────────────────────────────────

/**
 * Returns event handlers to attach to <video> elements.
 * Tracks play, pause, ended (complete), and time-based milestones.
 */
export function useVideoTracking(videoId?: string): {
  onPlay: () => void;
  onPause: () => void;
  onEnded: () => void;
} {
  const trackEvent = (
    type: AnalyticsEventType,
    extra?: Record<string, unknown>
  ) => {
    // Use shared buffer/flush from AnalyticsTracker context
    const evt: PendingEvent = { type, properties: { videoId, ...extra } };
    _buffer.push(evt);

    if (_buffer.length >= MAX_BUFFER_SIZE && _flushFn) {
      _flushFn();
    }
  };

  return {
    onPlay: () => trackEvent("video:view"),
    onPause: () => trackEvent("video:pause"),
    onEnded: () => trackEvent("video:complete", { watchPercentage: 80 }),
  };
}
