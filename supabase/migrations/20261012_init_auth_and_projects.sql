-- ==============================================================================
-- NEURA AUTHENTICATION & ROW LEVEL SECURITY (RLS) SCHEMA (PHASE 1.8)
-- ==============================================================================
-- Execute this migration script in your Supabase SQL Editor.
-- ==============================================================================

-- 1. Create the projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Science',
  style TEXT NOT NULL DEFAULT '3D Cinematic',
  model TEXT NOT NULL DEFAULT 'HunyuanVideo',
  score INTEGER NOT NULL DEFAULT 85,
  is_private BOOLEAN NOT NULL DEFAULT true,
  thumbnail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create indices for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_is_private ON public.projects(is_private);

-- 3. Enable Row Level Security (MANDATORY)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy: SELECT (Read access)
-- Users can view their own private projects, plus any public showcase projects
CREATE POLICY "Users can view their own or public projects"
  ON public.projects
  FOR SELECT
  USING (
    auth.uid() = user_id OR is_private = false
  );

-- 5. RLS Policy: INSERT (Creation access)
-- Authenticated users can only create projects associated with their own auth.uid()
CREATE POLICY "Authenticated users can insert their own projects"
  ON public.projects
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
  );

-- 6. RLS Policy: UPDATE (Modification access)
-- Users can only modify projects that they own
CREATE POLICY "Users can update their own projects"
  ON public.projects
  FOR UPDATE
  USING (
    auth.uid() = user_id
  )
  WITH CHECK (
    auth.uid() = user_id
  );

-- 7. RLS Policy: DELETE (Removal access)
-- Users can only delete projects that they own
CREATE POLICY "Users can delete their own projects"
  ON public.projects
  FOR DELETE
  USING (
    auth.uid() = user_id
  );

-- 8. Auto-update updated_at timestamp function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_projects_updated_at ON public.projects;
CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 9. Explicit Table Privileges for Supabase Roles
-- RLS policies govern row-level filtering, but PostgreSQL roles still require table-level grants.
GRANT SELECT ON public.projects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
