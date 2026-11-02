/**
 * NEURA PHASE 6 — STUDY SESSION TRACKER
 *
 * Opens a study session when mounted, closes it on unmount or visibility change.
 * Uses sendBeacon for reliable flush on page exit.
 *
 * Rules:
 * - Only tracks time while tab is visible.
 * - Pauses when tab is hidden, resumes when visible.
 * - Only works when Supabase is configured and user is authenticated.
 */

"use client";

import { useEffect, useRef } from "react";

interface StudySessionOptions {
  videoId?: string;
  activityType?: string;
  enabled: boolean; // pass false when user is not authenticated
}

export function useStudySession(options: StudySessionOptions) {
  const { videoId, activityType = "video_watch", enabled } = options;
  const sessionIdRef = useRef<string | null>(null);
  const isHiddenRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let closed = false;

    const openSession = async () => {
      try {
        const res = await fetch("/api/dashboard/study-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId: videoId ?? null, activityType }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.sessionId) {
            sessionIdRef.current = data.sessionId;
          }
        }
      } catch {
        // Non-blocking
      }
    };

    const closeSession = async () => {
      const id = sessionIdRef.current;
      if (!id || closed) return;
      closed = true;
      sessionIdRef.current = null;
      try {
        await fetch("/api/dashboard/study-sessions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: id }),
        });
      } catch {
        // Non-blocking
      }
    };

    const beaconClose = () => {
      const id = sessionIdRef.current;
      if (!id) return;
      sessionIdRef.current = null;
      try {
        navigator.sendBeacon(
          "/api/dashboard/study-sessions",
          new Blob(
            [JSON.stringify({ sessionId: id })],
            { type: "application/json" }
          )
        );
      } catch {
        // Best effort
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        isHiddenRef.current = true;
        beaconClose();
      } else {
        isHiddenRef.current = false;
        // Resume with new session
        openSession();
      }
    };

    const onBeforeUnload = () => {
      beaconClose();
    };

    openSession();

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
      closeSession();
    };
  }, [enabled, videoId, activityType]);
}
