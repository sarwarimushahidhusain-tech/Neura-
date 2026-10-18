-- ==============================================================================
-- NEURA PHASE 3: ASYNCHRONOUS VIDEO GENERATION JOBS TABLE & RLS POLICIES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.generation_jobs (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    topic TEXT NOT NULL,
    prompt TEXT NOT NULL,
    model TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'huggingface',
    status TEXT NOT NULL DEFAULT 'queued',
    progress_percent INT DEFAULT 0,
    video_url TEXT,
    error_code TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;

-- 1. SELECT policy: Users can only view their own generation jobs
DROP POLICY IF EXISTS "Users can view own generation jobs" ON public.generation_jobs;
CREATE POLICY "Users can view own generation jobs"
    ON public.generation_jobs FOR SELECT
    USING (auth.uid() = user_id);

-- 2. INSERT policy: Users can only insert jobs assigned to their own user_id
DROP POLICY IF EXISTS "Users can insert own generation jobs" ON public.generation_jobs;
CREATE POLICY "Users can insert own generation jobs"
    ON public.generation_jobs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE policy: Users can only update their own generation jobs
DROP POLICY IF EXISTS "Users can update own generation jobs" ON public.generation_jobs;
CREATE POLICY "Users can update own generation jobs"
    ON public.generation_jobs FOR UPDATE
    USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_generation_jobs_user_id ON public.generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON public.generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_created_at ON public.generation_jobs(created_at DESC);
