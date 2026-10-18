/**
 * NEURA PHASE 5 — VIDEO & METADATA VALIDATION
 * Server-side validation for files and educational video metadata.
 */

import type { EducationalLevel, SubjectCategory, LibraryVideoInput } from "@/types/library";

export const ALLOWED_VIDEO_MIMES = ["video/mp4", "video/webm"] as const;
export const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;

export const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200MB
export const MAX_THUMBNAIL_BYTES = 10 * 1024 * 1024; // 10MB

export const VALID_SUBJECTS: SubjectCategory[] = [
  "Physics",
  "Biology",
  "Chemistry",
  "Astronomy",
  "Mathematics",
  "Engineering",
  "Medicine",
  "Computer Science",
  "Earth Science",
  "General Science",
];

export const VALID_LEVELS: EducationalLevel[] = [
  "elementary",
  "middle_school",
  "high_school",
  "undergraduate",
  "all_levels",
];

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validates MP4 and WebM magic byte signatures directly from buffer.
 * Rejects disguised non-video files even if client sent video/mp4 MIME header.
 */
export function validateVideoMagicBytes(buffer: Uint8Array): { valid: boolean; detectedType?: string } {
  if (buffer.length < 12) {
    return { valid: false };
  }

  // MP4 check: ftyp box at offset 4 (bytes 4..7 = 0x66, 0x74, 0x79, 0x70)
  if (
    buffer[4] === 0x66 &&
    buffer[5] === 0x74 &&
    buffer[6] === 0x79 &&
    buffer[7] === 0x70
  ) {
    return { valid: true, detectedType: "video/mp4" };
  }

  // WebM check: EBML header 0x1A 0x45 0xDF 0xA3
  if (
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return { valid: true, detectedType: "video/webm" };
  }

  return { valid: false };
}

/**
 * Validates image magic bytes (JPEG, PNG, WebP)
 */
export function validateImageMagicBytes(buffer: Uint8Array): { valid: boolean; detectedType?: string } {
  if (buffer.length < 8) {
    return { valid: false };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { valid: true, detectedType: "image/png" };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, detectedType: "image/jpeg" };
  }

  // WebP: RIFF ... WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { valid: true, detectedType: "image/webp" };
  }

  return { valid: false };
}

/**
 * Validates uploaded video file size and type.
 */
export function validateUploadedVideoFile(
  buffer: Uint8Array,
  reportedMime: string,
  byteLength: number
): { valid: boolean; error?: string } {
  if (byteLength <= 0) {
    return { valid: false, error: "Uploaded video file is empty." };
  }

  if (byteLength > MAX_VIDEO_BYTES) {
    const mb = Math.round(MAX_VIDEO_BYTES / (1024 * 1024));
    return { valid: false, error: `Video file exceeds maximum size limit of ${mb}MB.` };
  }

  if (!ALLOWED_VIDEO_MIMES.includes(reportedMime as (typeof ALLOWED_VIDEO_MIMES)[number])) {
    return {
      valid: false,
      error: `Unsupported video MIME type '${reportedMime}'. Only MP4 and WebM are permitted.`,
    };
  }

  const magic = validateVideoMagicBytes(buffer);
  if (!magic.valid) {
    return {
      valid: false,
      error: "Invalid video file binary signature. The uploaded file is not a valid MP4 or WebM video.",
    };
  }

  return { valid: true };
}

/**
 * Sanitizes a storage file name to prevent directory traversal or malicious characters.
 */
export function sanitizeStorageFileName(originalName: string, prefix = "video"): string {
  const ext = originalName.split(".").pop()?.toLowerCase() || "mp4";
  const cleanExt = /^[a-z0-9]+$/.test(ext) ? ext : "mp4";
  const baseName = originalName
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);

  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 8);

  return `${prefix}-${baseName || "asset"}-${timestamp}-${randomPart}.${cleanExt}`;
}

/**
 * Validates video library metadata prior to saving to database.
 */
export function validateVideoMetadata(input: Partial<LibraryVideoInput>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.title || typeof input.title !== "string" || input.title.trim().length < 3) {
    errors.title = "Title is required and must be at least 3 characters long.";
  } else if (input.title.trim().length > 150) {
    errors.title = "Title cannot exceed 150 characters.";
  }

  if (!input.description || typeof input.description !== "string" || input.description.trim().length < 10) {
    errors.description = "Description is required and must be at least 10 characters long.";
  } else if (input.description.trim().length > 2000) {
    errors.description = "Description cannot exceed 2000 characters.";
  }

  if (!input.subject || !VALID_SUBJECTS.includes(input.subject as SubjectCategory)) {
    errors.subject = `Subject must be one of: ${VALID_SUBJECTS.join(", ")}.`;
  }

  if (!input.topic || typeof input.topic !== "string" || input.topic.trim().length < 2) {
    errors.topic = "Topic is required and must be at least 2 characters long.";
  } else if (input.topic.trim().length > 100) {
    errors.topic = "Topic cannot exceed 100 characters.";
  }

  if (input.duration_seconds !== undefined) {
    const dur = Number(input.duration_seconds);
    if (!Number.isInteger(dur) || dur < 0 || dur > 7200) {
      errors.duration_seconds = "Duration must be an integer between 0 and 7200 seconds.";
    }
  }

  if (input.educational_level && !VALID_LEVELS.includes(input.educational_level as EducationalLevel)) {
    errors.educational_level = `Educational level must be one of: ${VALID_LEVELS.join(", ")}.`;
  }

  if (!input.storage_path || typeof input.storage_path !== "string" || input.storage_path.trim().length === 0) {
    errors.storage_path = "Storage path is required.";
  } else if (input.storage_path.includes("..") || input.storage_path.startsWith("/")) {
    errors.storage_path = "Invalid storage path. Relative traversal is not permitted.";
  }

  if (input.tags && !Array.isArray(input.tags)) {
    errors.tags = "Tags must be an array of strings.";
  } else if (input.tags && input.tags.length > 25) {
    errors.tags = "Cannot exceed 25 tags per video.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
