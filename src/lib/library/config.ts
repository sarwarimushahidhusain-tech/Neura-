/**
 * NEURA PHASE 5 — VIDEO LIBRARY CONFIGURATION
 * Storage bucket definitions, MIME validation, and stream security settings.
 */

export const LIBRARY_CONFIG = {
  // Supabase Storage Bucket Names
  STORAGE_BUCKET_VIDEOS: "educational-videos",
  STORAGE_BUCKET_THUMBNAILS: "video-thumbnails",

  // Bucket Privacy
  VIDEOS_BUCKET_IS_PUBLIC: false,
  THUMBNAILS_BUCKET_IS_PUBLIC: true,

  // Stream & Signed URL Settings (1 hour short-lived signed URLs)
  SIGNED_URL_EXPIRATION_SECONDS: 3600,

  // File Size Limits
  MAX_VIDEO_BYTES: 200 * 1024 * 1024, // 200 MB
  MAX_THUMBNAIL_BYTES: 10 * 1024 * 1024, // 10 MB

  // Allowed MIME Types
  ALLOWED_VIDEO_MIMES: ["video/mp4", "video/webm"] as const,
  ALLOWED_IMAGE_MIMES: ["image/jpeg", "image/png", "image/webp"] as const,

  // Topic Matching Threshold
  MATCH_THRESHOLD: 20,
} as const;
