/**
 * NEURA PHASE 5 — VIDEO & THUMBNAIL UPLOAD ROUTE
 * POST /api/library/upload
 * Admin only: Securely uploads video or thumbnail file with binary validation.
 * Videos are strictly stored in private Supabase Storage without public URLs.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/library/admin-auth";
import {
  validateUploadedVideoFile,
  validateImageMagicBytes,
  sanitizeStorageFileName,
} from "@/lib/library/validation";
import { LIBRARY_CONFIG } from "@/lib/library/config";
import { createClient as createServerSupabase, createAdminClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 1. Enforce Server-Verified Admin Authorization
    const adminCheck = await verifyAdminRequest(req);
    if (!adminCheck.authorized) {
      return NextResponse.json(
        {
          success: false,
          error: adminCheck.error || "Forbidden: Only authorized administrators can upload video assets.",
          code: "FORBIDDEN",
        },
        { status: adminCheck.status || 403 }
      );
    }

    // 2. Enforce Supabase Storage Configuration
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "Supabase Storage is unconfigured. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (and SUPABASE_SERVICE_ROLE_KEY) in .env.local to upload video assets.",
          code: "STORAGE_UNCONFIGURED",
        },
        { status: 503 }
      );
    }

    // 3. Parse Multipart Form Data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const uploadType = (formData.get("type") as string) || "video"; // "video" | "thumbnail"

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file was uploaded.", code: "NO_FILE" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // 4. Strict Binary & MIME Validation
    if (uploadType === "video") {
      const videoValidation = validateUploadedVideoFile(buffer, file.type, file.size);
      if (!videoValidation.valid) {
        return NextResponse.json(
          {
            success: false,
            error: videoValidation.error || "Invalid video file upload.",
            code: "INVALID_VIDEO_FILE",
          },
          { status: 422 }
        );
      }
    } else {
      // Thumbnail validation
      if (file.size > LIBRARY_CONFIG.MAX_THUMBNAIL_BYTES) {
        return NextResponse.json(
          {
            success: false,
            error: "Thumbnail image exceeds 10MB limit.",
            code: "THUMBNAIL_TOO_LARGE",
          },
          { status: 422 }
        );
      }

      if (!LIBRARY_CONFIG.ALLOWED_IMAGE_MIMES.includes(file.type as (typeof LIBRARY_CONFIG.ALLOWED_IMAGE_MIMES)[number])) {
        return NextResponse.json(
          {
            success: false,
            error: "Unsupported thumbnail type. Allowed: JPEG, PNG, WebP.",
            code: "INVALID_IMAGE_MIME",
          },
          { status: 422 }
        );
      }

      const imgMagic = validateImageMagicBytes(buffer);
      if (!imgMagic.valid) {
        return NextResponse.json(
          {
            success: false,
            error: "File content does not match a valid JPEG, PNG, or WebP image signature.",
            code: "INVALID_IMAGE_SIGNATURE",
          },
          { status: 422 }
        );
      }
    }

    // 5. Generate Safe Storage Filename
    const isVideo = uploadType === "video";
    const bucket = isVideo
      ? LIBRARY_CONFIG.STORAGE_BUCKET_VIDEOS
      : LIBRARY_CONFIG.STORAGE_BUCKET_THUMBNAILS;

    const safeFileName = sanitizeStorageFileName(file.name, uploadType);
    const storagePath = `${bucket}/${safeFileName}`;

    // 6. Upload to Supabase Storage
    const adminSupabase = createAdminClient();
    const supabase = adminSupabase || (await createServerSupabase());

    if (!supabase) {
      return NextResponse.json(
        {
          success: false,
          error: "Storage client could not be initialized.",
          code: "STORAGE_CLIENT_ERROR",
        },
        { status: 500 }
      );
    }

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(safeFileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        {
          success: false,
          error: `Storage upload failed: ${uploadError.message}`,
          code: "STORAGE_UPLOAD_ERROR",
        },
        { status: 500 }
      );
    }

    // 7. URL Generation
    // Videos: PRIVATE - do NOT generate getPublicUrl()
    // Thumbnails: PUBLIC - getPublicUrl() is permitted
    let publicUrl: string | null = null;
    if (!isVideo) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(safeFileName);
      publicUrl = data.publicUrl;
    }

    return NextResponse.json(
      {
        success: true,
        storagePath,
        publicUrl,
        fileName: safeFileName,
        fileSize: file.size,
        mimeType: file.type,
        uploadType,
      },
      { status: 201 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to upload file";
    return NextResponse.json(
      { success: false, error: msg, code: "UPLOAD_FAILED" },
      { status: 500 }
    );
  }
}
