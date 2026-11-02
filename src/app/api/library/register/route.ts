/**
 * NEURA PHASE 5 — REGISTER EXISTING STORAGE VIDEO
 * POST /api/library/register
 *
 * Admin-only endpoint. Registers an already-uploaded Supabase Storage object
 * as a library_videos database record, without uploading the file again.
 *
 * - Verifies the storage object exists in the private bucket before inserting.
 * - Checks for an existing record by storage_path to prevent duplicates.
 * - Generates video_url using the private /api/library/stream route only.
 * - Never creates a public file URL or weakens bucket policies.
 *
 * Request body (JSON):
 *   {
 *     storage_path: string;      // e.g. "educational-videos/DNA.mp4"
 *     title: string;
 *     description: string;
 *     subject: SubjectCategory;
 *     topic: string;
 *     tags?: string[];
 *     thumbnail_url?: string | null;
 *     duration_seconds?: number;
 *     educational_level?: EducationalLevel;
 *     published?: boolean;
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/library/admin-auth";
import { registerStorageVideo } from "@/lib/library/service";
import { validateVideoMetadata } from "@/lib/library/validation";
import { LIBRARY_CONFIG } from "@/lib/library/config";
import { createAdminClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { SubjectCategory, EducationalLevel } from "@/types/library";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 1. Enforce Server-Verified Admin Authorization
    const adminCheck = await verifyAdminRequest(req);
    if (!adminCheck.authorized) {
      return NextResponse.json(
        {
          success: false,
          error:
            adminCheck.error ||
            "Forbidden: Only authorized administrators can register Storage videos.",
          code: "FORBIDDEN",
        },
        { status: adminCheck.status || 403 }
      );
    }

    // 2. Enforce Supabase Configuration
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Supabase is unconfigured. Configure credentials in .env.local.",
          code: "DB_UNCONFIGURED",
        },
        { status: 503 }
      );
    }

    // 3. Parse Request Body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body.", code: "INVALID_BODY" },
        { status: 400 }
      );
    }

    // 4. Validate storage_path format (must begin with bucket name, no traversal)
    const rawPath =
      typeof body.storage_path === "string" ? body.storage_path.trim() : "";
    if (!rawPath) {
      return NextResponse.json(
        {
          success: false,
          error: "storage_path is required.",
          code: "MISSING_PATH",
        },
        { status: 422 }
      );
    }

    if (rawPath.includes("..") || rawPath.startsWith("/")) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid storage_path: path traversal is not permitted.",
          code: "INVALID_PATH",
        },
        { status: 422 }
      );
    }

    // 5. Derive the relative file name within the bucket
    //    Accepts "educational-videos/DNA.mp4" or plain "DNA.mp4"
    const bucket = LIBRARY_CONFIG.STORAGE_BUCKET_VIDEOS; // "educational-videos"
    const bucketPrefix = `${bucket}/`;
    const relativeFileName = rawPath.startsWith(bucketPrefix)
      ? rawPath.slice(bucketPrefix.length)
      : rawPath;

    if (!relativeFileName) {
      return NextResponse.json(
        {
          success: false,
          error: "storage_path must include a file name after the bucket prefix.",
          code: "INVALID_PATH",
        },
        { status: 422 }
      );
    }

    // 6. Verify the Storage object actually exists in the private bucket
    //    Uses the admin client (service-role) to list the file by name.
    const adminSupabase = createAdminClient();
    if (!adminSupabase) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Admin Storage client unavailable. Ensure SUPABASE_SERVICE_ROLE_KEY is configured.",
          code: "STORAGE_CLIENT_ERROR",
        },
        { status: 503 }
      );
    }

    const lastSlashIndex = relativeFileName.lastIndexOf("/");
    const folderPath = lastSlashIndex !== -1 ? relativeFileName.slice(0, lastSlashIndex) : "";
    const fileNameOnly = lastSlashIndex !== -1 ? relativeFileName.slice(lastSlashIndex + 1) : relativeFileName;

    const { data: listData, error: listError } = await adminSupabase.storage
      .from(bucket)
      .list(folderPath, {
        search: fileNameOnly,
        limit: 10,
      });

    if (listError) {
      return NextResponse.json(
        {
          success: false,
          error: `Storage verification failed: ${listError.message}`,
          code: "STORAGE_VERIFY_FAILED",
        },
        { status: 500 }
      );
    }

    const fileExists = Array.isArray(listData) &&
      listData.some((item) => item.name === fileNameOnly);

    if (!fileExists) {
      return NextResponse.json(
        {
          success: false,
          error: `Storage object '${relativeFileName}' was not found in bucket '${bucket}'. Verify the file was uploaded correctly.`,
          code: "STORAGE_OBJECT_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Helper to normalize educational level input (e.g., 'College' -> 'undergraduate')
    const normalizeEducationalLevel = (level?: unknown): EducationalLevel => {
      if (typeof level !== "string") return "all_levels";
      const cleaned = level.trim().toLowerCase().replace(/[\s-]+/g, "_");
      if (cleaned === "college" || cleaned === "undergraduate" || cleaned === "university") {
        return "undergraduate";
      }
      if (cleaned === "high_school" || cleaned === "highschool") {
        return "high_school";
      }
      if (cleaned === "middle_school" || cleaned === "middleschool") {
        return "middle_school";
      }
      if (cleaned === "elementary" || cleaned === "elementary_school") {
        return "elementary";
      }
      if (cleaned === "all_levels" || cleaned === "all") {
        return "all_levels";
      }
      return cleaned as EducationalLevel;
    };

    // 7. Validate Metadata
    const metadataInput = {
      title: typeof body.title === "string" ? body.title : "",
      description: typeof body.description === "string" ? body.description : "",
      subject: body.subject as SubjectCategory,
      topic: typeof body.topic === "string" ? body.topic : "",
      tags: Array.isArray(body.tags) ? (body.tags as string[]) : [],
      thumbnail_url:
        typeof body.thumbnail_url === "string" ? body.thumbnail_url : null,
      storage_path: `${bucketPrefix}${relativeFileName}`,
      duration_seconds: Number(body.duration_seconds ?? 0),
      educational_level: normalizeEducationalLevel(body.educational_level),
      published: body.published !== false, // default true
    };

    const validation = validateVideoMetadata(metadataInput);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: "Video metadata validation failed.",
          errors: validation.errors,
          code: "VALIDATION_ERROR",
        },
        { status: 422 }
      );
    }

    // 8. Register — duplicate check + insert handled by the service layer
    //    Sanitize userId: the API-key auth path yields a sentinel "server-admin-key"
    //    string, not a real UUID. Pass null to avoid a Postgres uuid type error.
    const userId = adminCheck.user?.id;
    const safeUserId =
      !userId || userId === "server-admin-key" ? null : userId;

    const { video, alreadyExisted } = await registerStorageVideo(
      metadataInput,
      safeUserId
    );

    return NextResponse.json(
      {
        success: true,
        video,
        alreadyExisted,
        streamUrl: `/api/library/stream?id=${video.id}`,
        message: alreadyExisted
          ? `A record for storage path '${metadataInput.storage_path}' already exists. Returning existing record.`
          : `Storage video registered successfully. Stream at /api/library/stream?id=${video.id}`,
      },
      { status: alreadyExisted ? 200 : 201 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Registration failed.";
    const status = msg.includes("unconfigured") ? 503 : 500;
    return NextResponse.json(
      {
        success: false,
        error: msg,
        code: status === 503 ? "DB_UNCONFIGURED" : "REGISTER_FAILED",
      },
      { status }
    );
  }
}
