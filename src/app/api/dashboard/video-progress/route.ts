/**
 * NEURA PHASE 6 — VIDEO PROGRESS API
 * POST /api/dashboard/video-progress — upsert video progress for the authenticated user
 * GET  /api/dashboard/video-progress?videoId=<id> — fetch progress for a single video
 *
 * Security:
 * - User ID is sourced exclusively from the verified server session (getServerUser).
 * - Client never supplies user_id.
 * - Completion threshold: >= 90% watched triggers completion flag.
 * - Upsert prevents duplicate rows (ON CONFLICT DO UPDATE).
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerUser, createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

const COMPLETION_THRESHOLD = 0.9; // 90%

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: false, error: "Supabase not configured." }, { status: 503 });
    }

    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      try {
        const rawText = await req.text();
        body = JSON.parse(rawText);
      } catch {
        return NextResponse.json({ success: false, error: "Invalid JSON." }, { status: 400 });
      }
    }

    const {
      videoId,
      lastPositionSeconds,
      watchedSeconds,
      durationSeconds,
    } = body as {
      videoId?: unknown;
      lastPositionSeconds?: unknown;
      watchedSeconds?: unknown;
      durationSeconds?: unknown;
    };

    if (typeof videoId !== "string" || !videoId) {
      return NextResponse.json({ success: false, error: "videoId is required." }, { status: 400 });
    }

    const posSeconds = typeof lastPositionSeconds === "number" ? Math.max(0, Math.floor(lastPositionSeconds)) : 0;
    const watchedSec = typeof watchedSeconds === "number" ? Math.max(0, Math.floor(watchedSeconds)) : 0;
    let durationSec = typeof durationSeconds === "number" && durationSeconds > 0 ? Math.floor(durationSeconds) : 0;

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Database unavailable." }, { status: 503 });
    }

    // If duration was not passed or 0, attempt to look it up from library_videos
    if (durationSec <= 0) {
      const { data: vidRow } = await supabase
        .from("library_videos")
        .select("duration_seconds")
        .eq("id", videoId)
        .maybeSingle();
      if (vidRow && typeof vidRow.duration_seconds === "number" && vidRow.duration_seconds > 0) {
        durationSec = Math.floor(vidRow.duration_seconds);
      }
    }

    // Compute completion percentage (only when duration is known)
    const completionPct =
      durationSec > 0 ? Math.min(100, Math.round((watchedSec / durationSec) * 100 * 10) / 10) : 0;
    const isCompleted = durationSec > 0 && watchedSec / durationSec >= COMPLETION_THRESHOLD;

    const now = new Date().toISOString();

    // Fetch existing row first to preserve prior state (e.g., don't decrease watched_seconds)
    const { data: existing } = await supabase
      .from("video_progress")
      .select("id, watched_seconds, completed, started, started_at, completed_at")
      .eq("user_id", user.id)
      .eq("video_id", videoId)
      .maybeSingle();

    const newWatched = Math.max(watchedSec, existing?.watched_seconds ?? 0);
    const alreadyCompleted = existing?.completed ?? false;
    const alreadyStarted = existing?.started ?? false;

    const upsertData = {
      user_id: user.id,
      video_id: videoId,
      last_position_seconds: posSeconds,
      watched_seconds: newWatched,
      completion_pct: durationSec > 0
        ? Math.min(100, Math.round((newWatched / durationSec) * 100 * 10) / 10)
        : completionPct,
      completed: alreadyCompleted || isCompleted,
      completed_at: alreadyCompleted
        ? existing!.completed_at
        : isCompleted
        ? now
        : null,
      started: true,
      started_at: alreadyStarted ? existing!.started_at : now,
      last_watched_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from("video_progress")
      .upsert(upsertData, { onConflict: "user_id,video_id" })
      .select()
      .single();

    if (error) {
      console.error("[video-progress POST] Upsert error:", error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, progress: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: false, error: "Supabase not configured." }, { status: 503 });
    }

    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const videoId = new URL(req.url).searchParams.get("videoId");
    if (!videoId) {
      return NextResponse.json({ success: false, error: "videoId is required." }, { status: 400 });
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Database unavailable." }, { status: 503 });
    }

    const { data, error } = await supabase
      .from("video_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("video_id", videoId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, progress: data ?? null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
