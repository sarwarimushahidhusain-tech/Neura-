/**
 * NEURA PHASE 6 — STUDY SESSIONS API
 * POST /api/dashboard/study-sessions — open a new session
 * PUT  /api/dashboard/study-sessions — close an open session
 *
 * Security:
 * - User ID is always from the verified server session.
 * - Duration is computed server-side from started_at / ended_at, not from client.
 * - A session ID returned from POST must be passed back in PUT to prevent injection.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerUser, createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

// Maximum session duration we will ever store (safety cap): 8 hours
const MAX_SESSION_SECONDS = 8 * 60 * 60;

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
      return NextResponse.json({ success: false, error: "Invalid JSON." }, { status: 400 });
    }

    const { videoId, activityType } = body as {
      videoId?: unknown;
      activityType?: unknown;
    };

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Database unavailable." }, { status: 503 });
    }

    const { data, error } = await supabase
      .from("study_sessions")
      .insert({
        user_id: user.id,
        video_id: typeof videoId === "string" ? videoId : null,
        activity_type: typeof activityType === "string" ? activityType : "video_watch",
        started_at: new Date().toISOString(),
      })
      .select("id, started_at")
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, sessionId: data.id, startedAt: data.started_at });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
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
      return NextResponse.json({ success: false, error: "Invalid JSON." }, { status: 400 });
    }

    const { sessionId } = body as { sessionId?: unknown };
    if (typeof sessionId !== "string" || !sessionId) {
      return NextResponse.json({ success: false, error: "sessionId is required." }, { status: 400 });
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Database unavailable." }, { status: 503 });
    }

    // Verify the session belongs to this user and is still open
    const { data: existing } = await supabase
      .from("study_sessions")
      .select("id, started_at, ended_at")
      .eq("id", sessionId)
      .eq("user_id", user.id)  // ownership check
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ success: false, error: "Session not found." }, { status: 404 });
    }
    if (existing.ended_at) {
      // Already closed — idempotent, return success
      return NextResponse.json({ success: true, alreadyClosed: true });
    }

    const endedAt = new Date();
    const startedAt = new Date(existing.started_at);
    const rawDuration = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);
    const duration = Math.min(rawDuration, MAX_SESSION_SECONDS);

    // Ignore suspiciously short sessions (< 5 seconds — likely a page flicker)
    if (duration < 5) {
      // Delete instead of storing noise
      await supabase.from("study_sessions").delete().eq("id", sessionId);
      return NextResponse.json({ success: true, discarded: true, duration });
    }

    const { error } = await supabase
      .from("study_sessions")
      .update({
        ended_at: endedAt.toISOString(),
        duration_seconds: duration,
      })
      .eq("id", sessionId)
      .eq("user_id", user.id); // belt-and-suspenders ownership check

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, duration });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
