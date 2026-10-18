/**
 * NEURA PHASE 5 — VIDEO ITEM API ROUTE
 * GET    /api/library/videos/[id] — Retrieve video details and related videos
 * PATCH  /api/library/videos/[id] — Admin only: Update or publish/unpublish video
 * DELETE /api/library/videos/[id] — Admin only: Remove video from library
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getVideoById,
  getRelatedVideos,
  updateLibraryVideo,
  deleteLibraryVideo,
  incrementVideoViews,
} from "@/lib/library/service";
import { verifyAdminRequest } from "@/lib/library/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Check if requester is admin
    const adminAuth = await verifyAdminRequest(req);
    const isAdmin = adminAuth.authorized;

    const video = await getVideoById(id, isAdmin);
    if (!video) {
      return NextResponse.json(
        {
          success: false,
          error: "Video not found or is currently unpublished.",
          code: "NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Increment view count asynchronously in background
    incrementVideoViews(id).catch(() => {});

    // Fetch related videos from same subject
    const related = await getRelatedVideos(id, video.subject, 4);

    return NextResponse.json({
      success: true,
      video,
      related,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to load video";
    return NextResponse.json(
      { success: false, error: msg, code: "LOAD_FAILED" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await verifyAdminRequest(req);
    if (!adminCheck.authorized) {
      return NextResponse.json(
        {
          success: false,
          error: adminCheck.error || "Forbidden: Only administrators can update video details.",
          code: "FORBIDDEN",
        },
        { status: adminCheck.status || 403 }
      );
    }

    const { id } = await context.params;

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body.", code: "INVALID_BODY" },
        { status: 400 }
      );
    }

    const updated = await updateLibraryVideo(id, body);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Video not found.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      video: updated,
      message: "Video updated successfully.",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to update video";
    return NextResponse.json(
      { success: false, error: msg, code: "UPDATE_FAILED" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await verifyAdminRequest(req);
    if (!adminCheck.authorized) {
      return NextResponse.json(
        {
          success: false,
          error: adminCheck.error || "Forbidden: Only administrators can delete library videos.",
          code: "FORBIDDEN",
        },
        { status: adminCheck.status || 403 }
      );
    }

    const { id } = await context.params;
    const deleted = await deleteLibraryVideo(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Video not found or already deleted.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Video deleted successfully.",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to delete video";
    return NextResponse.json(
      { success: false, error: msg, code: "DELETE_FAILED" },
      { status: 500 }
    );
  }
}
