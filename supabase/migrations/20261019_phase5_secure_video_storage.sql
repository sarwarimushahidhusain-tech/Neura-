-- ==============================================================================
-- NEURA PHASE 5 — SECURE PRIVATE STORAGE & STREAMING ACCESS MIGRATION
-- ==============================================================================
-- Migration: 20261019_phase5_secure_video_storage.sql
-- Description:
--   1. Ensures 'educational-videos' bucket is strictly private (public = false).
--   2. Drops public read policies on 'educational-videos'.
--   3. Restricts storage objects access using least-privilege policies.
--   4. Updates seed video_url paths to use the authorized streaming endpoint.
-- ==============================================================================

-- 1. Ensure 'educational-videos' storage bucket is private
UPDATE storage.buckets
SET public = false
WHERE id = 'educational-videos';

-- 2. Drop any legacy public read policy that permitted direct unauthenticated reads
DROP POLICY IF EXISTS "Public read access for educational videos" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for video assets" ON storage.objects;

-- 3. Policy: Public read access ONLY for image thumbnails (video-thumbnails bucket)
DROP POLICY IF EXISTS "Public read access for video thumbnails" ON storage.objects;
CREATE POLICY "Public read access for video thumbnails"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'video-thumbnails');

-- 4. Policy: Direct storage reads of educational videos restricted to administrators
DROP POLICY IF EXISTS "Admins read educational videos" ON storage.objects;
CREATE POLICY "Admins read educational videos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'educational-videos'
    AND public.is_current_user_admin()
  );

-- 5. Update existing seed records to point to authorized streaming route
UPDATE public.library_videos
SET video_url = '/api/library/stream?id=' || id::text
WHERE video_url LIKE '/demo/%';
