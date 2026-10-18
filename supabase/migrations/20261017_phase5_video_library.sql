-- ==============================================================================
-- NEURA PHASE 5 — 3D EDUCATIONAL VIDEO LIBRARY & SEARCH
-- ==============================================================================
-- Migration: 20261017_phase5_video_library.sql
-- Description: Creates library_videos, user_roles, full-text search index,
--              Row Level Security (RLS) policies, and storage configurations.
-- ==============================================================================

-- 1. Create user_roles table for role-based access control (RBAC)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'student', 'creator', 'reviewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_user_id_key UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own role
CREATE POLICY "Users can read own role"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Helper function to check if current user is an admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
  OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin';
$$;

-- 3. Create library_videos table
CREATE TABLE IF NOT EXISTS public.library_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  thumbnail_url TEXT,
  storage_path TEXT NOT NULL,
  video_url TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  educational_level TEXT NOT NULL DEFAULT 'all_levels'
    CHECK (educational_level IN ('elementary', 'middle_school', 'high_school', 'undergraduate', 'all_levels')),
  published BOOLEAN NOT NULL DEFAULT false,
  views_count INTEGER NOT NULL DEFAULT 0 CHECK (views_count >= 0),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Full-text search vector generated automatically from metadata
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce(topic, '') || ' ' ||
      coalesce(subject, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      array_to_string(tags, ' ')
    )
  ) STORED
);

-- 4. Indices for high-performance search & filtering
CREATE INDEX IF NOT EXISTS idx_library_videos_search
  ON public.library_videos USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_library_videos_published
  ON public.library_videos(published);

CREATE INDEX IF NOT EXISTS idx_library_videos_subject
  ON public.library_videos(subject);

CREATE INDEX IF NOT EXISTS idx_library_videos_educational_level
  ON public.library_videos(educational_level);

CREATE INDEX IF NOT EXISTS idx_library_videos_created_at
  ON public.library_videos(created_at DESC);

-- 5. Row Level Security Policies
ALTER TABLE public.library_videos ENABLE ROW LEVEL SECURITY;

-- SELECT Policy: Public/students can read published videos; admins can read all
CREATE POLICY "Public can view published library videos"
  ON public.library_videos
  FOR SELECT
  USING (
    published = true
    OR public.is_current_user_admin()
  );

-- INSERT Policy: Only authorized administrators can insert
CREATE POLICY "Only admins can insert library videos"
  ON public.library_videos
  FOR INSERT
  WITH CHECK (
    public.is_current_user_admin()
  );

-- UPDATE Policy: Only authorized administrators can update
CREATE POLICY "Only admins can update library videos"
  ON public.library_videos
  FOR UPDATE
  USING (
    public.is_current_user_admin()
  )
  WITH CHECK (
    public.is_current_user_admin()
  );

-- DELETE Policy: Only authorized administrators can delete
CREATE POLICY "Only admins can delete library videos"
  ON public.library_videos
  FOR DELETE
  USING (
    public.is_current_user_admin()
  );

-- 6. Storage Buckets (educational-videos and video-thumbnails)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('educational-videos', 'educational-videos', true, 209715200, ARRAY['video/mp4', 'video/webm']),
  ('video-thumbnails', 'video-thumbnails', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS: Anyone can read from public educational buckets
CREATE POLICY "Public read access for educational videos"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('educational-videos', 'video-thumbnails'));

-- Storage RLS: Only admins can upload video assets
CREATE POLICY "Admins can upload educational video assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id IN ('educational-videos', 'video-thumbnails')
    AND public.is_current_user_admin()
  );

-- Storage RLS: Only admins can delete video assets
CREATE POLICY "Admins can delete educational video assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id IN ('educational-videos', 'video-thumbnails')
    AND public.is_current_user_admin()
  );

-- 7. Seed Sample Metadata (Development / Demo Records)
-- Clearly identifiable sample 3D curriculum records for testing search and playback
INSERT INTO public.library_videos (
  id,
  title,
  description,
  subject,
  topic,
  tags,
  thumbnail_url,
  storage_path,
  video_url,
  duration_seconds,
  educational_level,
  published,
  views_count
) VALUES
(
  'e1000000-0000-0000-0000-000000000001',
  'Newton''s Laws of Motion: Inertia, Force & Acceleration',
  'An immersive 3D simulation exploring Sir Isaac Newton''s three fundamental laws of classical mechanics, showcasing forces, friction, and reciprocal momentum with interactive physical vectors.',
  'Physics',
  'Newton''s Laws of Motion',
  ARRAY['physics', 'classical mechanics', 'newton', 'inertia', 'force', 'gravity', 'vectors', 'motion'],
  'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=800&q=80',
  'educational-videos/demo/newtons-laws-3d.mp4',
  '/demo/newton-motion.mp4',
  180,
  'high_school',
  true,
  1420
),
(
  'e1000000-0000-0000-0000-000000000002',
  'Solar System 3D Animation: Planetary Orbits & Gravitation',
  'A scale-calibrated 3D visual journey through our solar system, demonstrating Kepler''s laws of planetary motion, gravitational equilibrium, and the orbital mechanics of terrestrial and gas giant planets.',
  'Astronomy',
  'Solar System & Planetary Motion',
  ARRAY['astronomy', 'solar system', 'planets', 'gravity', 'orbits', 'kepler', 'space', 'sun'],
  'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=800&q=80',
  'educational-videos/demo/solar-system-3d.mp4',
  '/demo/solar-system.mp4',
  240,
  'middle_school',
  true,
  2840
),
(
  'e1000000-0000-0000-0000-000000000003',
  'Human Heart Blood Circulation: Cardiac Cycle & Valves',
  'Step inside the 4-chambered human heart in high-fidelity 3D. Follow oxygenated and deoxygenated blood pathways through atria, ventricles, aorta, and coronary arteries with cross-sectional valve dynamics.',
  'Medicine',
  'Human Heart Blood Circulation',
  ARRAY['biology', 'medicine', 'cardiology', 'heart', 'circulation', 'anatomy', 'blood', 'valves'],
  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
  'educational-videos/demo/human-heart-flow-3d.mp4',
  '/demo/heart-flow.mp4',
  210,
  'high_school',
  true,
  3510
),
(
  'e1000000-0000-0000-0000-000000000004',
  'Photosynthesis: Light Reactions & Calvin Cycle in 3D',
  'Explore the inner machinery of the chloroplast. Witness chlorophyll photon absorption, photolysis of water in Photosystem II, ATP synthesis, and enzymatic carbon fixation in the stroma.',
  'Biology',
  'Photosynthesis & Cellular Energy',
  ARRAY['biology', 'photosynthesis', 'chloroplast', 'calvin cycle', 'cell biology', 'plant science'],
  'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=800&q=80',
  'educational-videos/demo/photosynthesis-3d.mp4',
  '/demo/photosynthesis.mp4',
  195,
  'undergraduate',
  true,
  1890
),
(
  'e1000000-0000-0000-0000-000000000005',
  'Structure of an Atom: Quantum Orbitals & Subatomic Particles',
  'A microscopic 3D journey into atomic anatomy: protons, neutrons, quarks in the dense nucleus, and electron probability clouds described by quantum mechanical orbitals (s, p, d, f).',
  'Chemistry',
  'Structure of an Atom',
  ARRAY['chemistry', 'quantum mechanics', 'atom', 'electrons', 'protons', 'orbitals', 'nucleus'],
  'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=800&q=80',
  'educational-videos/demo/atom-structure-3d.mp4',
  '/demo/atom-structure.mp4',
  165,
  'high_school',
  true,
  2130
),
(
  'e1000000-0000-0000-0000-000000000006',
  'Electric Circuits: Voltage, Current, Resistance & Ohm''s Law',
  'Visualizing electron flow through conductors, resistors, and capacitors in 3D. Learn how potential difference drives current, and how series vs. parallel circuits partition electric potential.',
  'Physics',
  'Electric Circuits & Ohm''s Law',
  ARRAY['physics', 'circuits', 'electronics', 'electricity', 'ohms law', 'voltage', 'current', 'resistors'],
  'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
  'educational-videos/demo/electric-circuits-3d.mp4',
  '/demo/electric-circuits.mp4',
  175,
  'middle_school',
  true,
  1675
)
ON CONFLICT (id) DO NOTHING;
