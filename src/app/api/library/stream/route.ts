/**
 * NEURA PHASE 5 — VIDEO STREAMING & HTTP RANGE DELIVERY
 * GET /api/library/stream?id=<video_id>
 *
 * Secure private educational video streaming:
 * - Requires authenticated session or server-verified authorization.
 * - Resolves storage path strictly from trusted database records (rejects client-supplied paths).
 * - Verifies video existence and publication status before playback.
 * - Supports HTTP Range requests (206 Partial Content) for efficient seeking and progressive playback.
 * - Generates short-lived signed URLs from private Supabase Storage.
 * - Never exposes local public directories or service-role keys.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerUser, createClient as createServerSupabase, createAdminClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getVideoById } from "@/lib/library/service";
import { verifyUserIsAdmin } from "@/lib/library/admin-auth";
import { LIBRARY_CONFIG } from "@/lib/library/config";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("id") || searchParams.get("videoId");

    // 1. Require Video ID
    if (!videoId) {
      return NextResponse.json(
        {
          success: false,
          error: "Video ID parameter is required.",
          code: "MISSING_VIDEO_ID",
        },
        { status: 400 }
      );
    }

    // 2. Reject arbitrary client-supplied paths
    if (searchParams.has("path") && !videoId) {
      return NextResponse.json(
        {
          success: false,
          error: "Arbitrary file paths are not permitted. Video access must reference a valid video ID.",
          code: "INVALID_ACCESS_METHOD",
        },
        { status: 400 }
      );
    }

    // 3. Enforce Authentication Provider Configuration
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication service is unconfigured. Supabase credentials must be configured in .env.local to stream private educational videos.",
          code: "AUTH_UNCONFIGURED",
        },
        { status: 503 }
      );
    }

    // 4. Verify Authenticated Session or Explicit Server Authorization
    const authHeader = req.headers.get("authorization") || "";
    const adminApiKey = process.env.ADMIN_API_KEY?.trim();
    const isServerAdmin = Boolean(
      adminApiKey && adminApiKey.length >= 16 && authHeader === `Bearer ${adminApiKey}`
    );

    const user = await getServerUser();
    if (!user && !isServerAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required. Please sign in to stream educational videos.",
          code: "UNAUTHENTICATED",
        },
        { status: 401 }
      );
    }

    // 5. Evaluate Administrator Status
    const isAdmin = isServerAdmin || (user ? await verifyUserIsAdmin(user) : false);

    // 6. Look up Video from Trusted Database Record
    const video = await getVideoById(videoId, isAdmin);

    if (!video) {
      return NextResponse.json(
        {
          success: false,
          error: "Video not found.",
          code: "NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Shield unpublished videos from non-admin users without leaking metadata
    if (!video.published && !isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Video not found.",
          code: "NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // 7. Resolve Storage Path from Database Record
    const rawStoragePath = video.storage_path;
    if (!rawStoragePath) {
      return NextResponse.json(
        {
          success: false,
          error: "Video asset is not configured.",
          code: "ASSET_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Strip bucket prefix if stored as 'educational-videos/filename.mp4'
    const relativeFileName = rawStoragePath
      .replace(/^educational-videos[/\\]/, "")
      .replace(/^[/\\]+/, "");

    // 8. Generate Short-Lived Signed URL from Private Supabase Storage
    const adminSupabase = createAdminClient();
    const supabase = adminSupabase || (await createServerSupabase());

    if (!supabase) {
      return NextResponse.json(
        {
          success: false,
          error: "Storage service is temporarily unavailable.",
          code: "STORAGE_UNAVAILABLE",
        },
        { status: 503 }
      );
    }

    const { data: signedData, error: signError } = await supabase.storage
      .from(LIBRARY_CONFIG.STORAGE_BUCKET_VIDEOS)
      .createSignedUrl(relativeFileName, LIBRARY_CONFIG.SIGNED_URL_EXPIRATION_SECONDS);

    if (signError || !signedData?.signedUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Video asset is currently unavailable in private storage.",
          code: "ASSET_UNAVAILABLE",
        },
        { status: 404 }
      );
    }

    const signedUrl = signedData.signedUrl;

    // 9. Redirect Mode (Optional for clients requesting direct redirect)
    const mode = searchParams.get("mode");
    if (mode === "redirect") {
      return NextResponse.redirect(signedUrl, 307);
    }

    // 10. Server-Side Proxy Streaming with HTTP Range Support (Seeking)
    const rangeHeader = req.headers.get("range");
    const fetchHeaders: HeadersInit = {};
    if (rangeHeader) {
      fetchHeaders["Range"] = rangeHeader;
    }

    const upstreamRes = await fetch(signedUrl, {
      headers: fetchHeaders,
    });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      if (upstreamRes.status === 404) {
        return NextResponse.json(
          {
            success: false,
            error: "Video asset not found in private storage.",
            code: "NOT_FOUND",
          },
          { status: 404 }
        );
      }
      // If range error or upstream issue, redirect to signed URL
      return NextResponse.redirect(signedUrl, 307);
    }

    const responseHeaders = new Headers();
    responseHeaders.set(
      "Content-Type",
      upstreamRes.headers.get("content-type") || "video/mp4"
    );
    responseHeaders.set("Accept-Ranges", "bytes");
    responseHeaders.set("Cache-Control", "private, no-cache, no-store, max-age=0");

    if (upstreamRes.headers.get("content-range")) {
      responseHeaders.set("Content-Range", upstreamRes.headers.get("content-range")!);
    }
    if (upstreamRes.headers.get("content-length")) {
      responseHeaders.set("Content-Length", upstreamRes.headers.get("content-length")!);
    }

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status, // 206 Partial Content or 200 OK
      headers: responseHeaders,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Video stream failed";
    return NextResponse.json(
      { success: false, error: msg, code: "STREAM_FAILED" },
      { status: 500 }
    );
  }
}
