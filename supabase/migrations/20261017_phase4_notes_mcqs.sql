-- ==============================================================================
-- NEURA PHASE 4: STUDY NOTES, MCQ SETS, AND QUIZ ATTEMPTS
-- ==============================================================================
-- Run this in the Supabase SQL Editor after Phases 1–3.1 migrations.
-- ==============================================================================

-- -----------------------------------------------
-- 1. study_notes: persisted generated notes
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.study_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    topic TEXT NOT NULL,
    detail_level TEXT NOT NULL DEFAULT 'detailed',
    notes_json JSONB NOT NULL,
    model_used TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.study_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notes" ON public.study_notes;
CREATE POLICY "Users can view own notes"
    ON public.study_notes FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own notes" ON public.study_notes;
CREATE POLICY "Users can insert own notes"
    ON public.study_notes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notes" ON public.study_notes;
CREATE POLICY "Users can update own notes"
    ON public.study_notes FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notes" ON public.study_notes;
CREATE POLICY "Users can delete own notes"
    ON public.study_notes FOR DELETE
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_study_notes_user_id ON public.study_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_study_notes_project_id ON public.study_notes(project_id);

-- -----------------------------------------------
-- 2. mcq_sets: persisted MCQ sets (without answer keys in plaintext)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.mcq_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    topic TEXT NOT NULL,
    difficulty TEXT NOT NULL DEFAULT 'mixed',
    total_questions INT NOT NULL DEFAULT 0,
    -- questions_json contains the full questions including correctIndex (server-only field)
    questions_json JSONB NOT NULL,
    model_used TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

-- -----------------------------------------------
-- 3. quiz_attempts: stores student attempt results
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    mcq_set_id UUID REFERENCES public.mcq_sets(id) ON DELETE CASCADE NOT NULL,
    score INT NOT NULL DEFAULT 0,
    total INT NOT NULL DEFAULT 0,
    percentage INT NOT NULL DEFAULT 0,
    -- answers_json stores { questionId, chosenIndex } pairs only — no correctIndex
    answers_json JSONB NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Users can view own quiz attempts"
    ON public.quiz_attempts FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Users can insert own quiz attempts"
    ON public.quiz_attempts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_mcq_set_id ON public.quiz_attempts(mcq_set_id);
