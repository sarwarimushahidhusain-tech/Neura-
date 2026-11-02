/**
 * NEURA PHASE 6 — VIDEO PLAYBACK TRACKER
 *
 * Tracks genuine watch time and saves progress to the server.
 *
 * Rules:
 * - Only counts time while the video is actually playing (not paused/buffering).
 * - Stops counting when the browser tab is hidden.
 * - Saves position on pause, visibility change, and periodic interval.
 * - Uses beacon (sendBeacon) on page unload for reliable flush.
 * - Prevents double-counting across sessions.
 */

"use client";

import { useEffect, useRef, useCallback } from "react";

interface TrackerOptions {
  videoId: string;
  videoDurationSeconds: number;
  initialPositionSeconds?: number;
  onCompleted?: () => void;
}

interface ProgressPayload {
  videoId: string;
  lastPositionSeconds: number;
  watchedSeconds: number;
  durationSeconds: number;
}

const SAVE_INTERVAL_MS = 10_000; // save every 10 seconds of play

export function useVideoTracker(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  options: TrackerOptions
) {
  const { videoId, videoDurationSeconds, initialPositionSeconds = 0, onCompleted } = options;

  // Track accumulated watch seconds in this session
  const accumulatedRef = useRef(0);
  // Track total watched seconds loaded from server + accumulated this session
  const totalWatchedRef = useRef(0);
  // Timestamp when play started (null = paused)
  const playStartRef = useRef<number | null>(null);
  // Whether we've already fired the completion callback
  const completedFiredRef = useRef(false);
  // Last saved position (to debounce redundant saves)
  const lastSavedPositionRef = useRef(-1);
  // Save interval handle
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // -----------------------------------------------------------------------
  // Send progress to server
  // -----------------------------------------------------------------------
  const saveProgress = useCallback(
    async (position: number) => {
      const el = videoRef.current;
      const watched = totalWatchedRef.current + accumulatedRef.current;

      // Skip if no meaningful change
      if (
        Math.abs(position - lastSavedPositionRef.current) < 2 &&
        accumulatedRef.current === 0
      ) {
        return;
      }

      lastSavedPositionRef.current = position;

      const payload: ProgressPayload = {
        videoId,
        lastPositionSeconds: Math.floor(position),
        watchedSeconds: Math.floor(watched),
        durationSeconds: Math.floor(el?.duration || videoDurationSeconds || 0),
      };

      try {
        const res = await fetch("/api/dashboard/video-progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.warn("[useVideoTracker] Progress sync warning:", res.status, errData?.error || res.statusText);
        }
      } catch (err: unknown) {
        console.warn("[useVideoTracker] Failed to send progress:", err instanceof Error ? err.message : err);
      }
    },
    [videoId, videoDurationSeconds, videoRef]
  );

  // Beacon-based flush for page exit
  const beaconFlush = useCallback(
    (position: number) => {
      const el = videoRef.current;
      const watched = totalWatchedRef.current + accumulatedRef.current;
      const payload: ProgressPayload = {
        videoId,
        lastPositionSeconds: Math.floor(position),
        watchedSeconds: Math.floor(watched),
        durationSeconds: Math.floor(el?.duration || videoDurationSeconds || 0),
      };
      try {
        const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
        const queued = navigator.sendBeacon("/api/dashboard/video-progress", blob);
        if (!queued) {
          console.warn("[useVideoTracker] sendBeacon was not queued by browser");
        }
      } catch (err) {
        console.warn("[useVideoTracker] sendBeacon error:", err);
      }
    },
    [videoId, videoDurationSeconds, videoRef]
  );

  // -----------------------------------------------------------------------
  // Playback time accumulation
  // -----------------------------------------------------------------------
  const onPlay = useCallback(() => {
    if (document.hidden) return;
    playStartRef.current = Date.now();
  }, []);

  const onPause = useCallback(() => {
    if (playStartRef.current !== null) {
      const elapsed = (Date.now() - playStartRef.current) / 1000;
      accumulatedRef.current += Math.max(0, elapsed);
      playStartRef.current = null;
    }
    const el = videoRef.current;
    if (el) saveProgress(el.currentTime);
  }, [videoRef, saveProgress]);

  const onEnded = useCallback(() => {
    onPause();
    const el = videoRef.current;
    if (el && !completedFiredRef.current) {
      // Check threshold (90%) — server will also verify
      const dur = el.duration || videoDurationSeconds;
      const watched = totalWatchedRef.current + accumulatedRef.current;
      if (dur > 0 && watched / dur >= 0.9) {
        completedFiredRef.current = true;
        onCompleted?.();
      }
    }
  }, [onPause, videoRef, videoDurationSeconds, onCompleted]);

  // -----------------------------------------------------------------------
  // Visibility change — pause accumulation when tab hidden
  // -----------------------------------------------------------------------
  const onVisibilityChange = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;

    if (document.hidden) {
      // Tab hidden — pause accumulation and save
      if (playStartRef.current !== null) {
        const elapsed = (Date.now() - playStartRef.current) / 1000;
        accumulatedRef.current += Math.max(0, elapsed);
        playStartRef.current = null;
      }
      beaconFlush(el.currentTime);
    } else {
      // Tab visible again — resume accumulation if video is playing
      if (!el.paused) {
        playStartRef.current = Date.now();
      }
    }
  }, [videoRef, beaconFlush]);

  // -----------------------------------------------------------------------
  // Periodic save during long sessions
  // -----------------------------------------------------------------------
  useEffect(() => {
    saveIntervalRef.current = setInterval(() => {
      const el = videoRef.current;
      if (!el || el.paused) return;

      // Flush accumulated time up to now
      if (playStartRef.current !== null) {
        const elapsed = (Date.now() - playStartRef.current) / 1000;
        accumulatedRef.current += Math.max(0, elapsed);
        playStartRef.current = Date.now(); // reset start
      }

      saveProgress(el.currentTime);
    }, SAVE_INTERVAL_MS);

    return () => {
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
    };
  }, [videoRef, saveProgress]);

  // -----------------------------------------------------------------------
  // Wire up event listeners to the video element
  // -----------------------------------------------------------------------
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    // Restore last saved position
    if (initialPositionSeconds > 0 && el.readyState >= 1) {
      el.currentTime = initialPositionSeconds;
    } else if (initialPositionSeconds > 0) {
      const onLoaded = () => {
        el.currentTime = initialPositionSeconds;
        el.removeEventListener("loadedmetadata", onLoaded);
      };
      el.addEventListener("loadedmetadata", onLoaded);
    }

    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    document.addEventListener("visibilitychange", onVisibilityChange);

    const onBeforeUnload = () => {
      if (playStartRef.current !== null) {
        const elapsed = (Date.now() - playStartRef.current) / 1000;
        accumulatedRef.current += Math.max(0, elapsed);
        playStartRef.current = null;
      }
      beaconFlush(el.currentTime);
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
      // Final save on unmount
      if (playStartRef.current !== null) {
        const elapsed = (Date.now() - playStartRef.current) / 1000;
        accumulatedRef.current += Math.max(0, elapsed);
        playStartRef.current = null;
      }
      saveProgress(el.currentTime);
    };
  }, [
    videoRef,
    initialPositionSeconds,
    onPlay,
    onPause,
    onEnded,
    onVisibilityChange,
    beaconFlush,
    saveProgress,
  ]);

  // -----------------------------------------------------------------------
  // Expose a method to pre-load the server-stored watched total
  // -----------------------------------------------------------------------
  const setServerWatched = useCallback((seconds: number) => {
    totalWatchedRef.current = seconds;
  }, []);

  return { setServerWatched };
}
