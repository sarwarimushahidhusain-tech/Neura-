/**
 * NEURA PHASE 5 — VIDEO & THUMBNAIL UPLOAD ROUTE
 * POST /api/library/upload
 * Admin only: Securely uploads video or thumbnail file with binary validation.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/library/admin-auth";
import {
  validateUploadedVideoFile,
  validateImageMagicBytes,
  sanitizeStorageFileName,
  MAX_THUMBNAIL_BYTES,
  ALLOWED_IMAGE_MIMES,
} from "@/lib/library/validation";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import fs from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 1. Enforce Admin Authorization
    const adminCheck = await verifyAdminRequest(req);
    if (!adminCheck.authorized) {
      return NextResponse.json(
        {
          success: false,
          error: adminCheck.error || "Forbidden: Only administrators can upload video assets.",
          code: "FORBIDDEN",
        },
        { status: adminCheck.status || 403 }
      );
    }

    // 2. Parse Multipart Form Data
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

    // 3. Validation by Upload Type
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
      if (file.size > MAX_THUMBNAIL_BYTES) {
        return NextResponse.json(
          {
            success: false,
            error: "Thumbnail image exceeds 10MB limit.",
            code: "THUMBNAIL_TOO_LARGE",
          },
          { status: 422 }
        );
      }

      if (!ALLOWED_IMAGE_MIMES.includes(file.type as (typeof ALLOWED_IMAGE_MIMES)[number])) {
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

    // 4. Generate Safe Storage Filename
    const bucket = uploadType === "video" ? "educational-videos" : "video-thumbnails";
    const safeFileName = sanitizeStorageFileName(file.name, uploadType);
    const storagePath = `${bucket}/${safeFileName}`;

    // 5. Store File
    let publicUrl = "";

    if (isSupabaseConfigured()) {
      try {
        const supabase = await createServerSupabase();
        if (supabase) {
          const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(safeFileName, buffer, {
              contentType: file.type,
              upsert: true,
            });

          if (!uploadError) {
            const { data } = supabase.storage.from(bucket).getPublicUrl(safeFileName);
            publicUrl = data.publicUrl;
          }
        }
      } catch {
        // Fall back to local file storage below
      }
    }

    // Local file storage fallback (for offline dev environment)
    if (!publicUrl) {
      const uploadDir = path.join(process.cwd(), "public", "uploads", bucket);
      await fs.mkdir(uploadDir, { recursive: true });
      const localFilePath = path.join(uploadDir, safeFileName);
      await fs.writeFile(localFilePath, Buffer.from(buffer));
      publicUrl = `/uploads/${bucket}/${safeFileName}`;
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
