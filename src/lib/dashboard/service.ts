/**
 * NEURA PHASE 6 — LEARNING DASHBOARD SERVER SERVICE
 *
 * Fetches all dashboard metrics for an authenticated user.
 * - All queries run server-side with the anon Supabase client (RLS enforced).
 * - User ID is always sourced from the verified server session — never from client input.
 * - Duration values are in SECONDS throughout.
 */

import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VideoProgressRow {
  id: string;
  video_id: string;
  last_position_seconds: number;
  watched_seconds: number;
  completion_pct: number;
  completed: boolean;
  completed_at: string | null;
  started: boolean;
  started_at: string | null;
  last_watched_at: string;
  library_video: {
    id: string;
    title: string;
    subject: string;
    topic: string;
    thumbnail_url: string | null;
    video_url: string;
    duration_seconds: number;
    educational_level: string;
  } | null;
}

export interface QuizAttemptRow {
  id: string;
  mcq_set_id: string;
  score: number;
  total: number;
  percentage: number;
  attempted_at: string;
  library_video_id: string | null;
  mcq_set: {
    topic: string;
  } | null;
  library_video: {
    title: string;
    subject: string;
  } | null;
}

export interface StudySessionRow {
  id: string;
  video_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  activity_type: string;
}

export interface DashboardMetrics {
  videosStarted: number;
  videosCompleted: number;
  avgVideoCompletion: number; // 0–100
  quizAverage: number; // 0–100
  totalStudyTimeSeconds: number;
  recentVideos: VideoProgressRow[];
  allVideoProgress: VideoProgressRow[];
  quizAttempts: QuizAttemptRow[];
  studySessions: StudySessionRow[];
  dailyStudySeconds: Record<string, number>; // ISO date → seconds (last 7 days)
  subjectProgress: SubjectProgress[];
  schemaNotice?: string;
}

export interface SubjectProgress {
  subject: string;
  videosStarted: number;
  videosCompleted: number;
  avgCompletion: number;
  quizAvg: number;
  studySeconds: number;
}

// ---------------------------------------------------------------------------
// Main fetch
// ---------------------------------------------------------------------------

export async function getDashboardMetrics(userId: string): Promise<DashboardMetrics> {
  const supabase = await createClient();

  if (!supabase) {
    return emptyMetrics();
  }

  // Run queries in parallel where possible
  const [videoProgressResult, quizAttemptsResult, studySessionsResult] = await Promise.all([
    supabase
      .from("video_progress")
      .select(
        `id, video_id, last_position_seconds, watched_seconds, completion_pct,
         completed, completed_at, started, started_at, last_watched_at,
         library_video:library_videos(id, title, subject, topic, thumbnail_url, video_url, duration_seconds, educational_level)`
      )
      .eq("user_id", userId)
      .eq("started", true)
      .order("last_watched_at", { ascending: false }),

    supabase
      .from("quiz_attempts")
      .select(
        `id, mcq_set_id, score, total, percentage, attempted_at, library_video_id,
         mcq_set:mcq_sets(topic),
         library_video:library_videos(title, subject)`
      )
      .eq("user_id", userId)
      .order("attempted_at", { ascending: false })
      .limit(50),

    supabase
      .from("study_sessions")
      .select("id, video_id, started_at, ended_at, duration_seconds, activity_type")
      .eq("user_id", userId)
      .not("ended_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(200),
  ]);

  let schemaNotice: string | undefined;
  if (
    videoProgressResult.error?.code === "PGRST205" ||
    quizAttemptsResult.error?.code === "PGRST205" ||
    studySessionsResult.error?.code === "PGRST205" ||
    videoProgressResult.error?.message?.includes("Could not find the table")
  ) {
    schemaNotice =
      "Dashboard database tables are not yet created in Supabase. Run supabase/migrations/20261020_phase6_learning_dashboard.sql in the Supabase SQL Editor to enable persistent cloud tracking.";
    console.warn("[getDashboardMetrics] Supabase schema notice:", schemaNotice);
  }

  const rawVideoProgress = (videoProgressResult.data ?? []) as unknown as Array<
    Omit<VideoProgressRow, "library_video"> & {
      library_video: VideoProgressRow["library_video"] | VideoProgressRow["library_video"][];
    }
  >;
  const videoProgress: VideoProgressRow[] = rawVideoProgress.map((v) => ({
    ...v,
    library_video: Array.isArray(v.library_video)
      ? v.library_video[0] ?? null
      : v.library_video ?? null,
  }));

  const rawQuizAttempts = (quizAttemptsResult.data ?? []) as unknown as Array<
    Omit<QuizAttemptRow, "mcq_set" | "library_video"> & {
      mcq_set: QuizAttemptRow["mcq_set"] | QuizAttemptRow["mcq_set"][];
      library_video: QuizAttemptRow["library_video"] | QuizAttemptRow["library_video"][];
    }
  >;
  const quizAttempts: QuizAttemptRow[] = rawQuizAttempts.map((q) => ({
    ...q,
    mcq_set: Array.isArray(q.mcq_set) ? q.mcq_set[0] ?? null : q.mcq_set ?? null,
    library_video: Array.isArray(q.library_video)
      ? q.library_video[0] ?? null
      : q.library_video ?? null,
  }));

  const studySessions = (studySessionsResult.data ?? []) as unknown as StudySessionRow[];

  // --- Video metrics ---
  const videosStarted = videoProgress.length;
  const videosCompleted = videoProgress.filter((v) => v.completed).length;
  const avgVideoCompletion =
    videosStarted === 0
      ? 0
      : videoProgress.reduce((sum, v) => sum + Number(v.completion_pct), 0) / videosStarted;

  // --- Quiz metrics ---
  const quizAverage =
    quizAttempts.length === 0
      ? 0
      : quizAttempts.reduce((sum, q) => sum + q.percentage, 0) / quizAttempts.length;

  // --- Study time ---
  const totalStudyTimeSeconds = studySessions.reduce(
    (sum, s) => sum + (s.duration_seconds ?? 0),
    0
  );

  // --- Daily study time (last 7 days) ---
  const dailyStudySeconds: Record<string, number> = {};
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dailyStudySeconds[d.toISOString().slice(0, 10)] = 0;
  }
  for (const s of studySessions) {
    const day = s.started_at.slice(0, 10);
    if (day in dailyStudySeconds) {
      dailyStudySeconds[day] = (dailyStudySeconds[day] ?? 0) + (s.duration_seconds ?? 0);
    }
  }

  // --- Recent videos (last 5) ---
  const recentVideos = videoProgress.slice(0, 5);

  // --- Subject-wise progress ---
  const subjectMap: Record<
    string,
    {
      videosStarted: number;
      videosCompleted: number;
      completionSum: number;
      quizScoreSum: number;
      quizCount: number;
      studySeconds: number;
    }
  > = {};

  for (const v of videoProgress) {
    const subject = v.library_video?.subject ?? "Unknown";
    if (!subjectMap[subject]) {
      subjectMap[subject] = {
        videosStarted: 0,
        videosCompleted: 0,
        completionSum: 0,
        quizScoreSum: 0,
        quizCount: 0,
        studySeconds: 0,
      };
    }
    subjectMap[subject].videosStarted++;
    if (v.completed) subjectMap[subject].videosCompleted++;
    subjectMap[subject].completionSum += Number(v.completion_pct);
  }

  for (const q of quizAttempts) {
    const subject = q.library_video?.subject ?? "General";
    if (!subjectMap[subject]) {
      subjectMap[subject] = {
        videosStarted: 0,
        videosCompleted: 0,
        completionSum: 0,
        quizScoreSum: 0,
        quizCount: 0,
        studySeconds: 0,
      };
    }
    subjectMap[subject].quizScoreSum += q.percentage;
    subjectMap[subject].quizCount++;
  }

  const videoIdToSubject: Record<string, string> = {};
  for (const v of videoProgress) {
    if (v.video_id && v.library_video?.subject) {
      videoIdToSubject[v.video_id] = v.library_video.subject;
    }
  }
  for (const s of studySessions) {
    const subject = s.video_id ? (videoIdToSubject[s.video_id] ?? "General") : "General";
    if (!subjectMap[subject]) {
      subjectMap[subject] = {
        videosStarted: 0,
        videosCompleted: 0,
        completionSum: 0,
        quizScoreSum: 0,
        quizCount: 0,
        studySeconds: 0,
      };
    }
    subjectMap[subject].studySeconds += s.duration_seconds ?? 0;
  }

  const subjectProgress: SubjectProgress[] = Object.entries(subjectMap).map(
    ([subject, data]) => ({
      subject,
      videosStarted: data.videosStarted,
      videosCompleted: data.videosCompleted,
      avgCompletion:
        data.videosStarted === 0
          ? 0
          : Math.round(data.completionSum / data.videosStarted),
      quizAvg:
        data.quizCount === 0
          ? 0
          : Math.round(data.quizScoreSum / data.quizCount),
      studySeconds: data.studySeconds,
    })
  );

  return {
    videosStarted,
    videosCompleted,
    avgVideoCompletion: Math.round(avgVideoCompletion * 10) / 10,
    quizAverage: Math.round(quizAverage * 10) / 10,
    totalStudyTimeSeconds,
    recentVideos,
    allVideoProgress: videoProgress,
    quizAttempts,
    studySessions,
    dailyStudySeconds,
    subjectProgress,
    ...(schemaNotice ? { schemaNotice } : {}),
  };
}

function emptyMetrics(): DashboardMetrics {
  const dailyStudySeconds: Record<string, number> = {};
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dailyStudySeconds[d.toISOString().slice(0, 10)] = 0;
  }
  return {
    videosStarted: 0,
    videosCompleted: 0,
    avgVideoCompletion: 0,
    quizAverage: 0,
    totalStudyTimeSeconds: 0,
    recentVideos: [],
    allVideoProgress: [],
    quizAttempts: [],
    studySessions: [],
    dailyStudySeconds,
    subjectProgress: [],
  };
}
