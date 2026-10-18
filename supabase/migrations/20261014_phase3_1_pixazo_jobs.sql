-- ==============================================================================
-- NEURA PHASE 3.1: PIXAZO LTX 2.5 LITE PROVIDER JOB METADATA
-- ==============================================================================

-- Add provider_job_id to track external asynchronous provider task IDs (e.g. Pixazo request_id)
ALTER TABLE public.generation_jobs
    ADD COLUMN IF NOT EXISTS provider_job_id TEXT,
    ADD COLUMN IF NOT EXISTS cost_estimate NUMERIC(6, 4);

-- Index for querying jobs by provider request ID
CREATE INDEX IF NOT EXISTS idx_generation_jobs_provider_job_id ON public.generation_jobs(provider_job_id);
