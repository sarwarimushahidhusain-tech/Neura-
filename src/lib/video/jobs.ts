import type { VideoJobStatus } from "@/types/ai";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

// Server-side in-memory cache for fast status polling and sandbox mode
const memoryJobStore = new Map<string, VideoJobStatus>();

/**
 * Saves or updates a video generation job.
 */
export async function saveJob(job: VideoJobStatus): Promise<void> {
  const normalized: VideoJobStatus = {
    ...job,
    updatedAt: new Date().toISOString(),
  };

  // Always update in-memory cache
  memoryJobStore.set(job.jobId, normalized);

  // If Supabase is configured, persist to database
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      if (supabase) {
        // Try upserting with Phase 3.1 columns first
        const payload: Record<string, unknown> = {
          id: normalized.jobId,
          user_id: normalized.userId || null,
          project_id: normalized.projectId || null,
          topic: normalized.topic || "Educational Video",
          prompt: "",
          model: normalized.model || "ltx-2-5-lite",
          provider: normalized.provider || "pixazo",
          status: normalized.status,
          progress_percent: normalized.progressPercent || 0,
          video_url: normalized.videoUrl || null,
          provider_job_id: normalized.providerJobId || null,
          cost_estimate: normalized.costEstimate || null,
          error_code: normalized.errorCode || null,
          error_message: normalized.error || null,
          updated_at: normalized.updatedAt,
        };

        const { error: upsertErr } = await supabase.from("generation_jobs").upsert(payload);
        if (upsertErr) {
          // If column doesn't exist yet on remote, retry without provider_job_id and cost_estimate
          delete payload.provider_job_id;
          delete payload.cost_estimate;
          await supabase.from("generation_jobs").upsert(payload);
        }
      }
    } catch {
      // In sandbox/unmigrated mode, memory store ensures zero disruption
    }
  }
}

/**
 * Retrieves a job by ID.
 */
export async function getJob(jobId: string): Promise<VideoJobStatus | null> {
  // Check memory store first
  const cached = memoryJobStore.get(jobId);
  if (cached) return cached;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("generation_jobs")
          .select("*")
          .eq("id", jobId)
          .single();

        if (data && !error) {
          const mapped: VideoJobStatus = {
            jobId: data.id,
            userId: data.user_id,
            projectId: data.project_id,
            topic: data.topic,
            status: data.status,
            provider: data.provider,
            model: data.model,
            progressPercent: data.progress_percent,
            videoUrl: data.video_url,
            providerJobId: data.provider_job_id || undefined,
            costEstimate: data.cost_estimate ? Number(data.cost_estimate) : undefined,
            error: data.error_message,
            errorCode: data.error_code,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
          memoryJobStore.set(jobId, mapped);
          return mapped;
        }
      }
    } catch {
      // Fallback
    }
  }

  return null;
}

/**
 * Updates a job's progress, status, or output.
 */
export async function updateJobStatus(
  jobId: string,
  updates: Partial<VideoJobStatus>
): Promise<VideoJobStatus | null> {
  const existing = await getJob(jobId);
  if (!existing) return null;

  const updated: VideoJobStatus = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await saveJob(updated);
  return updated;
}
