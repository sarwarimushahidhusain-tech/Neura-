-- ==============================================================================
-- NEURA — WEAK POINT DETECTION DATA LAYER (v3, scoped RLS & strict grants)
-- ==============================================================================
-- Migration: 20261023191000_weak_point_detection.sql
-- Branch: feature/weak-point-detection
--
-- Dependency order:
--   1. topics                — Normalized topic taxonomy (service_role write, scoped authenticated read)
--   2. mcq_sets.topic_id    — Nullable FK to topics (additive; free-form topic TEXT unchanged)
--   3. library_videos.topic_id — Nullable FK to topics (exact-match recommendations only)
--   4. question_results      — Per-question correctness (server-write-only via function)
--   5. record_quiz_attempt() — SECURITY DEFINER atomic write function
--   6. user_topic_stats      — Security-invoker view (counts + accuracy only; trend in TS)
--
-- Safety guarantees:
--   - Additive only: no DROP TABLE, TRUNCATE, or data-destructive ALTER.
--   - IF NOT EXISTS / IF EXISTS guards everywhere: safe to run on fresh or partially-applied schemas.
--   - Explicit REVOKE ALL on tables, view, and function from anon/authenticated before granting SELECT.
--   - Scoped topics SELECT policy: users read topics only if they have question_results or library_videos reference it.
--   - All policy evaluations use (SELECT auth.uid()).
--
-- DO NOT apply to production. Branch/local database only.
-- ==============================================================================


-- ==============================================================================
-- 1. topics — Normalized topic taxonomy
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.topics (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  subject    TEXT        NOT NULL DEFAULT '' CHECK (char_length(subject) <= 100),
  slug       TEXT        NOT NULL CHECK (char_length(slug) BETWEEN 1 AND 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT topics_slug_unique UNIQUE (slug)
);

ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

-- Scoped topics SELECT policy: a user can read a topic ONLY if they have
-- an existing question_results record for it or if a library_videos row references it.
DROP POLICY IF EXISTS "Authenticated users can read topics" ON public.topics;
DROP POLICY IF EXISTS "Users can read own active or library topics" ON public.topics;
CREATE POLICY "Users can read own active or library topics"
  ON public.topics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.question_results qr
      WHERE qr.topic_id = topics.id
        AND qr.user_id = (SELECT auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.library_videos lv
      WHERE lv.topic_id = topics.id
    )
  );

-- Explicit permission revokes: do not rely on default privileges
REVOKE ALL ON TABLE public.topics FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.topics TO authenticated;
GRANT ALL    ON TABLE public.topics TO service_role;

CREATE INDEX IF NOT EXISTS idx_topics_slug    ON public.topics (slug);
CREATE INDEX IF NOT EXISTS idx_topics_subject ON public.topics (subject);


-- ==============================================================================
-- 2. mcq_sets.topic_id — Nullable FK (additive; free-form `topic` TEXT unchanged)
-- ==============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'mcq_sets'
      AND column_name  = 'topic_id'
  ) THEN
    ALTER TABLE public.mcq_sets
      ADD COLUMN topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL;
    COMMENT ON COLUMN public.mcq_sets.topic_id IS
      'Resolved topic taxonomy FK. NULL means not yet mapped at generation time.';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_mcq_sets_topic_id ON public.mcq_sets (topic_id);


-- ==============================================================================
-- 3. library_videos.topic_id — Nullable FK (exact-match recommendations only)
-- ==============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'library_videos'
      AND column_name  = 'topic_id'
  ) THEN
    ALTER TABLE public.library_videos
      ADD COLUMN topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL;
    COMMENT ON COLUMN public.library_videos.topic_id IS
      'Normalized topic FK for exact-match video recommendations. NULL means not yet tagged.';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_library_videos_topic_id ON public.library_videos (topic_id);


-- ==============================================================================
-- 4. question_results — Per-question correctness records (server-write-only)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.question_results (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id     UUID        NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- ON DELETE RESTRICT: prevents removing a topic that still has question records.
  topic_id       UUID        NOT NULL REFERENCES public.topics(id) ON DELETE RESTRICT,
  question_index INTEGER     NOT NULL CHECK (question_index >= 0),
  concept_ref    TEXT,
  difficulty     TEXT        CHECK (difficulty IN ('easy', 'medium', 'hard')),
  is_correct     BOOLEAN     NOT NULL,
  answered_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT question_results_attempt_idx_unique UNIQUE (attempt_id, question_index)
);

ALTER TABLE public.question_results ENABLE ROW LEVEL SECURITY;

-- Users can only read their own rows; explicit (SELECT auth.uid()) prevents evaluation ambiguities
DROP POLICY IF EXISTS "Users can read own question results" ON public.question_results;
CREATE POLICY "Users can read own question results"
  ON public.question_results FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Explicit permission revokes: writes flow exclusively through record_quiz_attempt()
REVOKE ALL ON TABLE public.question_results FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.question_results TO authenticated;
GRANT ALL    ON TABLE public.question_results TO service_role;

-- Compound index for per-user, per-topic chronological queries
CREATE INDEX IF NOT EXISTS idx_question_results_user_topic_time
  ON public.question_results (user_id, topic_id, answered_at ASC, attempt_id, question_index);

CREATE INDEX IF NOT EXISTS idx_question_results_attempt_id
  ON public.question_results (attempt_id);


-- ==============================================================================
-- 5. record_quiz_attempt() — Atomic write function (SECURITY DEFINER)
--
--    Parameter types match quiz_attempts columns exactly:
--      p_user_id       UUID     -> quiz_attempts.user_id (UUID)
--      p_mcq_set_id    UUID     -> quiz_attempts.mcq_set_id (UUID)
--      p_video_id      UUID     -> quiz_attempts.library_video_id (UUID)
--      p_score         INTEGER  -> quiz_attempts.score (INTEGER)
--      p_total         INTEGER  -> quiz_attempts.total (INTEGER)
--      p_percentage    INTEGER  -> quiz_attempts.percentage (INTEGER)
--      p_answers_json  JSONB    -> quiz_attempts.answers_json (JSONB)
--      p_questions     JSONB    -> array of [{index, is_correct, concept_ref, difficulty}]
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.record_quiz_attempt(
  p_user_id       UUID,
  p_mcq_set_id    UUID,
  p_video_id      UUID,
  p_topic_slug    TEXT,
  p_topic_name    TEXT,
  p_topic_subject TEXT,
  p_score         INTEGER,
  p_total         INTEGER,
  p_percentage    INTEGER,
  p_answers_json  JSONB,
  p_questions     JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_topic_id      UUID;
  v_attempt_id    UUID;
  v_q             JSONB;
  v_diff          TEXT;
  v_clean_name    TEXT;
  v_clean_subject TEXT;
BEGIN
  -- Strict JSON array validation
  IF p_questions IS NULL OR jsonb_typeof(p_questions) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'record_quiz_attempt: p_questions must be a JSON array, got %', coalesce(jsonb_typeof(p_questions), 'null');
  END IF;

  -- Defensive string input caps
  v_clean_name    := left(coalesce(nullif(trim(p_topic_name), ''), 'Unknown'), 200);
  v_clean_subject := left(coalesce(nullif(trim(p_topic_subject), ''), ''), 100);

  IF trim(p_topic_slug) = '' OR p_topic_slug IS NULL THEN
    RAISE EXCEPTION 'record_quiz_attempt: p_topic_slug must not be blank';
  END IF;

  -- 5a. Upsert topic by slug
  INSERT INTO public.topics (name, subject, slug)
  VALUES (v_clean_name, v_clean_subject, p_topic_slug)
  ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO v_topic_id
    FROM public.topics
   WHERE slug = p_topic_slug;

  IF v_topic_id IS NULL THEN
    RAISE EXCEPTION 'record_quiz_attempt: could not resolve topic_id for slug %', p_topic_slug;
  END IF;

  -- 5b. Insert quiz_attempts row
  INSERT INTO public.quiz_attempts (
    user_id, mcq_set_id, library_video_id,
    score, total, percentage,
    answers_json, attempted_at
  )
  VALUES (
    p_user_id, p_mcq_set_id, p_video_id,
    p_score, p_total, p_percentage,
    coalesce(p_answers_json, '[]'::jsonb), now()
  )
  RETURNING id INTO v_attempt_id;

  -- 5c. Insert per-question results
  FOR v_q IN SELECT * FROM jsonb_array_elements(p_questions)
  LOOP
    v_diff := CASE
      WHEN (v_q->>'difficulty') IN ('easy','medium','hard') THEN v_q->>'difficulty'
      ELSE NULL
    END;

    INSERT INTO public.question_results (
      attempt_id, user_id, topic_id,
      question_index, concept_ref, difficulty,
      is_correct, answered_at
    )
    VALUES (
      v_attempt_id,
      p_user_id,
      v_topic_id,
      (v_q->>'index')::INTEGER,
      NULLIF(trim(coalesce(v_q->>'concept_ref', '')), ''),
      v_diff,
      (v_q->>'is_correct')::BOOLEAN,
      now()
    );
  END LOOP;

  -- 5d. Back-patch mcq_sets.topic_id for this user
  IF p_mcq_set_id IS NOT NULL THEN
    UPDATE public.mcq_sets
       SET topic_id = v_topic_id
     WHERE id        = p_mcq_set_id
       AND user_id   = p_user_id
       AND topic_id IS NULL;
  END IF;

  RETURN v_attempt_id;
END;
$$;

-- Strict revocation: callable strictly by service_role
REVOKE ALL ON FUNCTION public.record_quiz_attempt(
  UUID, UUID, UUID, TEXT, TEXT, TEXT,
  INTEGER, INTEGER, INTEGER, JSONB, JSONB
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.record_quiz_attempt(
  UUID, UUID, UUID, TEXT, TEXT, TEXT,
  INTEGER, INTEGER, INTEGER, JSONB, JSONB
) TO service_role;


-- ==============================================================================
-- 6. user_topic_stats — Security-invoker aggregate view
-- ==============================================================================

DROP VIEW IF EXISTS public.user_topic_stats;

CREATE VIEW public.user_topic_stats
  WITH (security_invoker = true)
AS
SELECT
  qr.user_id,
  qr.topic_id,
  t.name    AS topic_name,
  t.subject AS topic_subject,
  t.slug    AS topic_slug,
  COUNT(*)                                                         AS total_answered,
  SUM(CASE WHEN qr.is_correct THEN 1 ELSE 0 END)                  AS total_correct,
  ROUND(
    SUM(CASE WHEN qr.is_correct THEN 1 ELSE 0 END)::NUMERIC
    / NULLIF(COUNT(*), 0)::NUMERIC * 100,
    1
  )                                                                AS accuracy_pct,
  MIN(qr.answered_at)                                              AS first_answered_at,
  MAX(qr.answered_at)                                              AS last_answered_at
FROM public.question_results qr
JOIN public.topics t ON t.id = qr.topic_id
GROUP BY
  qr.user_id, qr.topic_id,
  t.name, t.subject, t.slug;

REVOKE ALL ON TABLE public.user_topic_stats FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.user_topic_stats TO authenticated;
GRANT SELECT ON TABLE public.user_topic_stats TO service_role;


-- ==============================================================================
-- END OF FORWARD MIGRATION
-- ==============================================================================
