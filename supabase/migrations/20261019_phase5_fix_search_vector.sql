-- ==============================================================================
-- NEURA PHASE 5 — SEARCH VECTOR REPAIR & IMMUTABILITY FIX MIGRATION
-- ==============================================================================
-- Migration: 20261019_phase5_fix_search_vector.sql
-- Description:
--   Fixes PostgreSQL error 42P17 (generation expression is not immutable)
--   by safely establishing a trigger-maintained tsvector column and GIN index.
--   Safe to run repeatedly on both fresh and partially migrated databases.
-- ==============================================================================

-- 1. Ensure library_videos table exists and has search_vector column
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'library_videos') THEN
    -- If search_vector exists as a generated column, drop it safely to convert to regular column
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'library_videos'
        AND column_name = 'search_vector'
        AND is_generated = 'ALWAYS'
    ) THEN
      ALTER TABLE public.library_videos DROP COLUMN search_vector CASCADE;
    END IF;

    -- Add regular tsvector column
    ALTER TABLE public.library_videos ADD COLUMN IF NOT EXISTS search_vector tsvector;
  END IF;
END $$;

-- 2. Trigger function to compute search_vector from metadata using explicit catalog
CREATE OR REPLACE FUNCTION public.library_videos_search_vector_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.search_vector := to_tsvector('pg_catalog.english',
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.topic, '') || ' ' ||
    coalesce(NEW.subject, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(array_to_string(NEW.tags, ' '), '')
  );
  RETURN NEW;
END;
$$;

-- 3. Trigger on INSERT or UPDATE of relevant text and tag columns
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'library_videos') THEN
    DROP TRIGGER IF EXISTS trg_library_videos_search_vector ON public.library_videos;
    CREATE TRIGGER trg_library_videos_search_vector
      BEFORE INSERT OR UPDATE OF title, topic, subject, description, tags
      ON public.library_videos
      FOR EACH ROW
      EXECUTE FUNCTION public.library_videos_search_vector_trigger();

    -- 4. Create GIN index for full-text search performance
    CREATE INDEX IF NOT EXISTS idx_library_videos_search
      ON public.library_videos USING gin(search_vector);

    -- 5. Backfill search_vector for any existing video records
    UPDATE public.library_videos
    SET search_vector = to_tsvector('pg_catalog.english',
      coalesce(title, '') || ' ' ||
      coalesce(topic, '') || ' ' ||
      coalesce(subject, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(array_to_string(tags, ' '), '')
    )
    WHERE search_vector IS NULL;
  END IF;
END $$;
