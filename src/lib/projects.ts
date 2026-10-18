import { createClient as createBrowserSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Project } from "@/types";

export const PUBLIC_SHOWCASE_PROJECTS: Project[] = [
  {
    id: "demo-p1",
    title: "How the Human Heart Pumps Blood",
    date: "Public Showcase",
    category: "Science",
    style: "3D Cinematic",
    model: "HunyuanVideo",
    score: 91,
    topic: "How the Human Heart Pumps Blood",
    jobStatus: "completed",
    videoUrl: "/demo/heart-flow.mp4",
  },
  {
    id: "demo-p2",
    title: "Newton's Laws of Motion",
    date: "Public Showcase",
    category: "Physics",
    style: "Educational",
    model: "LTX",
    score: 88,
    topic: "Newton's Laws of Motion",
    jobStatus: "completed",
    videoUrl: "/demo/newton-motion.mp4",
  },
  {
    id: "demo-p3",
    title: "How Photosynthesis Works",
    date: "Public Showcase",
    category: "Biology",
    style: "Stylized 3D",
    model: "CogVideoX",
    score: 86,
    topic: "How Photosynthesis Works",
    jobStatus: "completed",
    videoUrl: "/demo/photosynthesis.mp4",
  },
];

interface ProjectRow {
  id: string;
  user_id?: string;
  title: string;
  created_at: string;
  category: string;
  style: string;
  model: string;
  score: number;
  thumbnail?: string | null;
  topic?: string | null;
  master_prompt?: string | null;
  job_status?: string | null;
  video_url?: string | null;
  educational_plan?: unknown;
  provider_id?: string | null;
  error_details?: string | null;
}

const LOCAL_STORAGE_KEY = "neura_saved_projects";

/**
 * Loads projects accessible to the current user.
 * In a configured Supabase environment, queries public.projects enforcing Row Level Security.
 * If unconfigured or offline, provides the local sandbox store combined with public showcase.
 */
export async function getProjects(): Promise<{ projects: Project[]; isLiveDb: boolean }> {
  if (isSupabaseConfigured()) {
    const supabase = createBrowserSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          const mapped: Project[] = (data as ProjectRow[]).map((row: ProjectRow) => ({
            id: row.id,
            title: row.title,
            date: new Date(row.created_at).toLocaleDateString(),
            category: row.category,
            style: row.style,
            model: row.model,
            score: row.score,
            thumbnail: row.thumbnail || undefined,
            topic: row.topic || undefined,
            masterPrompt: row.master_prompt || undefined,
            jobStatus: row.job_status || "awaiting_video_provider",
            videoUrl: row.video_url || undefined,
          }));

          return { projects: mapped, isLiveDb: true };
        }
      } catch {
        // Fall through to offline cache
      }
    }
  }

  // Local sandbox cache
  let localProjects: Project[] = [];
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        localProjects = JSON.parse(raw);
      }
    } catch {
      // Ignore local storage error
    }
  }

  const combined = [...localProjects, ...PUBLIC_SHOWCASE_PROJECTS];
  return { projects: combined, isLiveDb: false };
}

/**
 * Saves or updates a project with AI educational plan and master prompt.
 */
export async function saveProject(project: {
  id?: string;
  title: string;
  topic: string;
  category?: string;
  style: string;
  model: string;
  score?: number;
  educationalPlan?: unknown;
  masterPrompt?: string;
  jobStatus?: string;
  videoUrl?: string;
}): Promise<{ id: string; isLiveDb: boolean }> {
  const projectId = project.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `proj_${Date.now()}`);

  if (isSupabaseConfigured()) {
    const supabase = createBrowserSupabase();
    if (supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error } = await supabase.from("projects").upsert({
            id: projectId,
            user_id: user.id,
            title: project.title,
            topic: project.topic,
            category: project.category || "Science",
            style: project.style,
            model: project.model,
            score: project.score ?? 88,
            educational_plan: project.educationalPlan,
            master_prompt: project.masterPrompt,
            job_status: project.jobStatus || "awaiting_video_provider",
            video_url: project.videoUrl,
          });

          if (!error) {
            return { id: projectId, isLiveDb: true };
          }
        }
      } catch {
        // Fall back to local storage
      }
    }
  }

  // Save to local storage for offline prototype mode
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      const existing: Project[] = raw ? JSON.parse(raw) : [];
      const newProject: Project = {
        id: projectId,
        title: project.title,
        date: new Date().toLocaleDateString(),
        category: project.category || "Science",
        style: project.style,
        model: project.model,
        score: project.score ?? 88,
        topic: project.topic,
        masterPrompt: project.masterPrompt,
        jobStatus: project.jobStatus || "awaiting_video_provider",
        videoUrl: project.videoUrl,
      };

      const filtered = existing.filter((p) => p.id !== projectId);
      filtered.unshift(newProject);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
    } catch {
      // Ignore local storage error
    }
  }

  return { id: projectId, isLiveDb: false };
}
