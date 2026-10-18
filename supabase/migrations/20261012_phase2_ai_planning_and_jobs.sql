-- ==============================================================================
-- NEURA PHASE 2: AI PROMPT ENGINE & VIDEO GENERATION METADATA
-- ==============================================================================
-- Run this migration in Supabase SQL Editor to expand public.projects with
-- AI educational plan, master prompt, and asynchronous job status tracking.
-- ==============================================================================

-- 1. Add Phase 2 columns to projects table
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS topic TEXT,
  ADD COLUMN IF NOT EXISTS educational_plan JSONB,
  ADD COLUMN IF NOT EXISTS master_prompt TEXT,
  ADD COLUMN IF NOT EXISTS job_status TEXT NOT NULL DEFAULT 'awaiting_video_provider',
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS provider_id TEXT DEFAULT 'unconfigured',
  ADD COLUMN IF NOT EXISTS error_details TEXT;

-- 2. Create index on job_status for query performance
CREATE INDEX IF NOT EXISTS idx_projects_job_status ON public.projects(job_status);

-- 3. Row Level Security policies remain strictly enforced from Phase 1.8:
-- SELECT: auth.uid() = user_id OR is_private = false
-- INSERT / UPDATE / DELETE: auth.uid() = user_id
