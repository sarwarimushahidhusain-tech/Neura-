/**
 * NEURA PHASE 5 — EDUCATIONAL 3D VIDEO LIBRARY TYPES
 */

export type EducationalLevel =
  | "elementary"
  | "middle_school"
  | "high_school"
  | "undergraduate"
  | "all_levels";

export type SubjectCategory =
  | "Physics"
  | "Biology"
  | "Chemistry"
  | "Astronomy"
  | "Mathematics"
  | "Engineering"
  | "Medicine"
  | "Computer Science"
  | "Earth Science"
  | "General Science";

export interface LibraryVideo {
  id: string;
  title: string;
  description: string;
  subject: SubjectCategory;
  topic: string;
  tags: string[];
  thumbnail_url: string | null;
  storage_path: string;
  video_url: string;
  duration_seconds: number;
  educational_level: EducationalLevel;
  published: boolean;
  views_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LibraryVideoInput {
  title: string;
  description: string;
  subject: SubjectCategory;
  topic: string;
  tags?: string[];
  thumbnail_url?: string | null;
  storage_path: string;
  video_url?: string;
  duration_seconds: number;
  educational_level?: EducationalLevel;
  published?: boolean;
}

export interface LibrarySearchParams {
  query?: string;
  subject?: string;
  level?: string;
  sort?: "relevance" | "newest" | "duration";
  page?: number;
  limit?: number;
  includeUnpublished?: boolean;
}

export interface LibrarySearchResult {
  videos: LibraryVideo[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  query?: string;
  filters: {
    subject?: string;
    level?: string;
    sort?: string;
  };
}

export interface VideoUploadResult {
  storagePath: string;
  publicUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  durationSeconds?: number;
}
