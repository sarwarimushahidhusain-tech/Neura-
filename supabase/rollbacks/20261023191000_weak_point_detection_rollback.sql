-- ==============================================================================
-- NEURA — WEAK POINT DETECTION: ROLLBACK
-- ==============================================================================
-- Rollback: 20261023191000_weak_point_detection_rollback.sql
-- Location: supabase/rollbacks/ (isolated from CLI forward migrations)
-- Branch: feature/weak-point-detection
--
-- Reverses the weak point detection forward migration in safe reverse-dependency order.
-- All steps are guarded with IF EXISTS so the script is safe to re-run.
--
-- ⚠ DATA LOSS WARNING:
--   Dropping question_results permanently destroys all per-question correctness
--   history (including any backfilled rows). Do NOT run against production.
-- ==============================================================================

-- 1. Drop the security-invoker view (no data, safe first).
DROP VIEW IF EXISTS public.user_topic_stats;

-- 2. Drop the atomic write function.
DROP FUNCTION IF EXISTS public.record_quiz_attempt(
  UUID, UUID, UUID, TEXT, TEXT, TEXT,
  INTEGER, INTEGER, INTEGER, JSONB, JSONB
);

-- 3. Drop question_results (CASCADE removes indexes and RLS policies).
--    ⚠ Permanently destroys all per-question correctness history.
DROP TABLE IF EXISTS public.question_results CASCADE;

-- 4. Remove topic_id from library_videos.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'library_videos'
      AND column_name  = 'topic_id'
  ) THEN
    ALTER TABLE public.library_videos DROP COLUMN topic_id;
  END IF;
END $$;

-- 5. Remove topic_id from mcq_sets.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'mcq_sets'
      AND column_name  = 'topic_id'
  ) THEN
    ALTER TABLE public.mcq_sets DROP COLUMN topic_id;
  END IF;
END $$;

-- 6. Drop topics (CASCADE removes its indexes and RLS policies).
--    Only succeeds if question_results was already dropped (step 3).
DROP TABLE IF EXISTS public.topics CASCADE;

-- ==============================================================================
-- END OF ROLLBACK
-- ==============================================================================
