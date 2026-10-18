/**
 * NEURA PHASE 5 — VIDEOS API ROUTE
 * GET  /api/library/videos — Search & list published educational videos
 * POST /api/library/videos — Admin only: Add new educational video
 */

import { NextRequest, NextResponse } from "next/server";
import { searchVideos, createLibraryVideo } from "@/lib/library/service";
import { verifyAdminRequest } from "@/lib/library/admin-auth";
import { validateVideoMetadata } from "@/lib/library/validation";
import type { SubjectCategory } from "@/types/library";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || searchParams.get("query") || "";
    const subject = searchParams.get("subject") || undefined;
    const level = searchParams.get("level") || undefined;
    const sort = (searchParams.get("sort") as "relevance" | "newest" | "duration") || "relevance";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "12", 10)));
    const includeUnpublished = searchParams.get("include_unpublished") === "true";

    // If caller requests unpublished videos, check admin authorization
    let isAdmin = false;
    if (includeUnpublished) {
      const adminAuth = await verifyAdminRequest(req);
      isAdmin = adminAuth.authorized;
    }

    const result = await searchVideos(
      {
        query,
        subject,
        level,
        sort,
        page,
        limit,
        includeUnpublished: isAdmin && includeUnpublished,
      },
      isAdmin
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to search video library";
    return NextResponse.json(
      {
        success: false,
        error: msg,
        code: "SEARCH_FAILED",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Enforce admin authorization
    const adminCheck = await verifyAdminRequest(req);
    if (!adminCheck.authorized) {
      return NextResponse.json(
        {
          success: false,
          error: adminCheck.error || "Forbidden: Only administrators can upload educational videos.",
          code: "FORBIDDEN",
        },
        { status: adminCheck.status || 403 }
      );
    }

    // 2. Parse and validate body
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body.", code: "INVALID_BODY" },
        { status: 400 }
      );
    }

    const validation = validateVideoMetadata(body);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed on educational video metadata.",
          errors: validation.errors,
          code: "VALIDATION_ERROR",
        },
        { status: 422 }
      );
    }

    // 3. Create video record
    const created = await createLibraryVideo(
      {
        title: body.title,
        description: body.description,
        subject: body.subject as SubjectCategory,
        topic: body.topic,
        tags: body.tags || [],
        thumbnail_url: body.thumbnail_url || null,
        storage_path: body.storage_path,
        video_url: body.video_url,
        duration_seconds: Number(body.duration_seconds) || 0,
        educational_level: body.educational_level || "all_levels",
        published: body.published ?? false,
      },
      adminCheck.user?.id
    );

    return NextResponse.json(
      {
        success: true,
        video: created,
        message: "Educational video created successfully.",
      },
      { status: 201 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to create video record";
    return NextResponse.json(
      { success: false, error: msg, code: "CREATE_FAILED" },
      { status: 500 }
    );
  }
}
