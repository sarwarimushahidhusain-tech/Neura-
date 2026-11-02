-- ==============================================================================
-- NEURA PHASE 6 — PERSONAL LEARNING DASHBOARD & PREREQUISITES MIGRATION
-- ==============================================================================
-- Migration: 20261020_phase6_learning_dashboard.sql
-- Description:
--   Self-contained, idempotent, forward-only migration for:
--     1. projects       — Prerequisite table for user creations and MCQ sets
--     2. mcq_sets       — Prerequisite table for structured quiz questions
--     3. quiz_attempts  — Quiz attempt score & answer tracking (created/adapted)
--     4. video_progress — Per-user playback position, watch time, 90% completion
--     5. study_sessions — Active learning intervals (deduplicated by user)
--
-- Compatibility & Safety:
--   - Safe on fresh and partially migrated schemas (IF NOT EXISTS guards).
--   - Compatible with existing public.library_videos and public.user_roles.
--   - Enforces strict Row Level Security (RLS) on all user data (auth.uid() = user_id).
--   - Zero destructive operations (no DROP TABLE, no TRUNCATE).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. projects (Prerequisite for project-linked study assets)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  category    TEXT        NOT NULL DEFAULT 'Science',
  style       TEXT        NOT NULL DEFAULT '3D Cinematic',
  model       TEXT        NOT NULL DEFAULT 'HunyuanVideo',
  score       INTEGER     NOT NULL DEFAULT 85,
  is_private  BOOLEAN     NOT NULL DEFAULT true,
  thumbnail   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own or public projects" ON public.projects;
CREATE POLICY "Users can view their own or public projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id OR is_private = false);

DROP POLICY IF EXISTS "Authenticated users can insert their own projects" ON public.projects;
CREATE POLICY "Authenticated users can insert their own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);

-- ------------------------------------------------------------------------------
-- 2. mcq_sets (Prerequisite for quiz attempts and dashboard joined queries)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mcq_sets (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id      UUID        REFERENCES public.projects(id) ON DELETE SET NULL,
  topic           TEXT        NOT NULL,
  difficulty      TEXT        NOT NULL DEFAULT 'mixed',
  total_questions INTEGER     NOT NULL DEFAULT 0,
  questions_json  JSONB       NOT NULL DEFAULT '[]'::jsonb,
  model_used      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mcq_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own mcq sets" ON public.mcq_sets;
CREATE POLICY "Users can view own mcq sets"
  ON public.mcq_sets FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own mcq sets" ON public.mcq_sets;
CREATE POLICY "Users can insert own mcq sets"
  ON public.mcq_sets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own mcq sets" ON public.mcq_sets;
CREATE POLICY "Users can delete own mcq sets"
  ON public.mcq_sets FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_mcq_sets_user_id ON public.mcq_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_mcq_sets_project_id ON public.mcq_sets(project_id);

-- ------------------------------------------------------------------------------
-- 3. quiz_attempts (Stores student attempt results, scores, answers, and video link)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mcq_set_id        UUID        REFERENCES public.mcq_sets(id) ON DELETE SET NULL,
  library_video_id  UUID        REFERENCES public.library_videos(id) ON DELETE SET NULL,
  score             INTEGER     NOT NULL DEFAULT 0 CHECK (score >= 0),
  total             INTEGER     NOT NULL DEFAULT 0 CHECK (total >= 0),
  percentage        INTEGER     NOT NULL DEFAULT 0 CHECK (percentage >= 0 AND percentage <= 100),
  answers_json      JSONB       NOT NULL DEFAULT '[]'::jsonb,
  attempted_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safe conditional schema adaptations in case quiz_attempts partially existed
DO $$
BEGIN
  -- 1. Ensure library_video_id column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'quiz_attempts' 
      AND column_name = 'library_video_id'
  ) THEN
    ALTER TABLE public.quiz_attempts 
      ADD COLUMN library_video_id UUID REFERENCES public.library_videos(id) ON DELETE SET NULL;
  END IF;

  -- 2. Ensure mcq_set_id is nullable (to support video quizzes taken without pre-saved mcq_sets)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'quiz_attempts' 
      AND column_name = 'mcq_set_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.quiz_attempts ALTER COLUMN mcq_set_id DROP NOT NULL;
  END IF;
END $$;

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Users can view own quiz attempts"
  ON public.quiz_attempts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Users can insert own quiz attempts"
  ON public.quiz_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Users can delete own quiz attempts"
  ON public.quiz_attempts FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_attempted_at ON public.quiz_attempts(user_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_mcq_set_id ON public.quiz_attempts(mcq_set_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_library_video_id ON public.quiz_attempts(library_video_id);

-- ------------------------------------------------------------------------------
-- 4. video_progress (Tracks per-user playback position, watch time, 90% completion)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.video_progress (
  id                     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id               UUID          NOT NULL REFERENCES public.library_videos(id) ON DELETE CASCADE,
  last_position_seconds  INTEGER       NOT NULL DEFAULT 0 CHECK (last_position_seconds >= 0),
  watched_seconds        INTEGER       NOT NULL DEFAULT 0 CHECK (watched_seconds >= 0),
  completion_pct         NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (completion_pct >= 0 AND completion_pct <= 100),
  completed              BOOLEAN       NOT NULL DEFAULT false,
  completed_at           TIMESTAMPTZ,
  started                BOOLEAN       NOT NULL DEFAULT false,
  started_at             TIMESTAMPTZ,
  last_watched_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT video_progress_user_video_unique UNIQUE (user_id, video_id)
);

ALTER TABLE public.video_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own video progress" ON public.video_progress;
CREATE POLICY "Users can view own video progress"
  ON public.video_progress FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own video progress" ON public.video_progress;
CREATE POLICY "Users can insert own video progress"
  ON public.video_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own video progress" ON public.video_progress;
CREATE POLICY "Users can update own video progress"
  ON public.video_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_video_progress_user_id ON public.video_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_video_id ON public.video_progress(video_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_last_watched ON public.video_progress(user_id, last_watched_at DESC);

-- ------------------------------------------------------------------------------
-- 5. study_sessions (Active learning intervals, deduplicated by user session)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id          UUID        REFERENCES public.library_videos(id) ON DELETE SET NULL,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at          TIMESTAMPTZ,
  duration_seconds  INTEGER     CHECK (duration_seconds >= 0),
  activity_type     TEXT        NOT NULL DEFAULT 'video_watch',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own study sessions" ON public.study_sessions;
CREATE POLICY "Users can view own study sessions"
  ON public.study_sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own study sessions" ON public.study_sessions;
CREATE POLICY "Users can insert own study sessions"
  ON public.study_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own study sessions" ON public.study_sessions;
CREATE POLICY "Users can update own study sessions"
  ON public.study_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON public.study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_started_at ON public.study_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_sessions_video_id ON public.study_sessions(video_id);

-- ------------------------------------------------------------------------------
-- 6. Role Permissions Grants
-- ------------------------------------------------------------------------------
GRANT ALL ON TABLE public.projects TO authenticated, service_role;
GRANT ALL ON TABLE public.mcq_sets TO authenticated, service_role;
GRANT ALL ON TABLE public.quiz_attempts TO authenticated, service_role;
GRANT ALL ON TABLE public.video_progress TO authenticated, service_role;
GRANT ALL ON TABLE public.study_sessions TO authenticated, service_role;

GRANT SELECT ON TABLE public.projects TO anon;

-- ==============================================================================
-- END OF MIGRATION
-- ==============================================================================
