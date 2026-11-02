"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CheckCircle2,
  TrendingUp,
  Clock,
  BarChart3,
  Play,
  Brain,
  AlertCircle,
  Loader2,
  RotateCw,
  ChevronRight,
  Star,
  Award,
  Zap,
  Calendar,
  Target,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStoredUser, subscribeToAuthChanges, type AuthUser } from "@/lib/auth";
import type { DashboardMetrics, VideoProgressRow, QuizAttemptRow, SubjectProgress } from "@/lib/dashboard/service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSeconds(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${Math.round(sec % 60)}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatRelativeDate(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return formatDate(iso);
  } catch {
    return "—";
  }
}

// ---------------------------------------------------------------------------
// Mini bar chart for 7-day study time
// ---------------------------------------------------------------------------
function StudyBarChart({ daily }: { daily: Record<string, number> }) {
  const entries = Object.entries(daily);
  const maxSec = Math.max(...entries.map(([, v]) => v), 1);

  return (
    <div className="flex items-end gap-1.5 h-16">
      {entries.map(([date, sec]) => {
        const pct = (sec / maxSec) * 100;
        const dayLabel = new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" });
        return (
          <div key={date} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="w-full flex flex-col justify-end" style={{ height: "52px" }}>
              <div
                className="w-full rounded-t-sm bg-gradient-to-t from-[#00D4E8]/60 to-[#00D4E8]/30 group-hover:from-[#00D4E8] group-hover:to-[#00D4E8]/60 transition-all duration-200"
                style={{ height: `${Math.max(pct, 4)}%` }}
              />
            </div>
            <span className="text-[9px] text-muted-foreground font-mono">{dayLabel}</span>
            {/* Tooltip */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#0B101C] border border-border px-1.5 py-0.5 rounded text-[10px] text-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
              {sec > 0 ? formatSeconds(sec) : "No activity"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Score trend sparkline
// ---------------------------------------------------------------------------
function ScoreTrend({ attempts }: { attempts: QuizAttemptRow[] }) {
  // Show last 8 attempts chronologically
  const data = [...attempts].reverse().slice(-8);
  if (data.length < 2) return null;

  const maxPct = 100;
  const w = 120;
  const h = 36;
  const pts = data.map((a, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (a.percentage / maxPct) * h;
    return `${x},${y}`;
  });

  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke="#00D4E8"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((a, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - (a.percentage / maxPct) * h;
        return (
          <circle key={i} cx={x} cy={y} r="3" fill="#00D4E8" />
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Overview stat card
// ---------------------------------------------------------------------------
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "cyan",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: "cyan" | "violet" | "teal" | "orange";
}) {
  const colorMap = {
    cyan: "text-[#00D4E8] bg-[#00D4E8]/10 border-[#00D4E8]/20",
    violet: "text-[#9565F5] bg-[#9565F5]/10 border-[#9565F5]/20",
    teal: "text-[#00C9B7] bg-[#00C9B7]/10 border-[#00C9B7]/20",
    orange: "text-[#FF9B25] bg-[#FF9B25]/10 border-[#FF9B25]/20",
  };
  const iconColor = {
    cyan: "text-[#00D4E8]",
    violet: "text-[#9565F5]",
    teal: "text-[#00C9B7]",
    orange: "text-[#FF9B25]",
  };

  return (
    <div className="glass-card rounded-2xl p-5 card-lift cursor-default">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl border ${colorMap[color]}`}>
          <Icon className={`w-4 h-4 ${iconColor[color]}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
      <p className="text-xs font-medium text-foreground/80 mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------
function ProgressBar({
  pct,
  color = "#00D4E8",
  className = "",
}: {
  pct: number;
  color?: string;
  className?: string;
}) {
  return (
    <div className={`h-1.5 w-full rounded-full bg-[#1B2635] overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{
          width: `${Math.min(100, Math.max(0, pct))}%`,
          background: color,
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------
function SectionHeader({ icon: Icon, title, count }: { icon: React.ElementType; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="p-2 rounded-xl bg-[#00D4E8]/10 border border-[#00D4E8]/20">
        <Icon className="w-4 h-4 text-[#00D4E8]" />
      </div>
      <h2 className="text-base font-bold text-foreground">{title}</h2>
      {count !== undefined && count > 0 && (
        <span className="ml-auto text-xs font-mono text-muted-foreground bg-[#0B101C] border border-border px-2 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState({ icon: Icon, title, message }: { icon: React.ElementType; title: string; message: string }) {
  return (
    <div className="text-center py-10 space-y-3">
      <div className="w-12 h-12 rounded-2xl bg-[#0B101C] border border-border flex items-center justify-center mx-auto">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground max-w-xs mx-auto">{message}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Video progress card
// ---------------------------------------------------------------------------
function VideoProgressCard({ progress, isRecent = false }: { progress: VideoProgressRow; isRecent?: boolean }) {
  const video = progress.library_video;
  if (!video) return null;

  const pct = Math.round(Number(progress.completion_pct));
  const barColor = progress.completed ? "#00C9B7" : "#00D4E8";

  const resumeUrl = `/library/${video.id}${progress.last_position_seconds > 0 ? `?t=${progress.last_position_seconds}` : ""}`;

  return (
    <div className="glass-card rounded-xl p-4 card-lift">
      <div className="flex gap-3">
        {/* Thumbnail */}
        <div className="w-20 h-14 rounded-lg overflow-hidden bg-[#0B101C] border border-border flex-shrink-0 relative">
          {video.thumbnail_url ? (
            <Image
              src={video.thumbnail_url}
              alt={video.title}
              fill
              className="object-cover"
              sizes="80px"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          {progress.completed && (
            <div className="absolute inset-0 bg-[#00C9B7]/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-[#00C9B7]" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">{video.title}</p>
            {progress.completed ? (
              <span className="text-[10px] font-mono text-[#00C9B7] bg-[#00C9B7]/10 border border-[#00C9B7]/30 px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                ✓ Done
              </span>
            ) : (
              <span className="text-[10px] font-mono text-[#00D4E8] bg-[#00D4E8]/10 border border-[#00D4E8]/30 px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                {pct}%
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">{video.subject}</span>
            <span className="text-[10px] text-muted-foreground">·</span>
            <span className="text-[10px] text-muted-foreground">{formatRelativeDate(progress.last_watched_at)}</span>
          </div>

          <ProgressBar pct={pct} color={barColor} />

          {isRecent && (
            <Link href={resumeUrl}>
              <Button
                size="sm"
                className="h-6 text-[10px] px-2.5 bg-[#00D4E8]/10 hover:bg-[#00D4E8]/20 text-[#00D4E8] border border-[#00D4E8]/30 rounded-full gap-1 mt-1"
              >
                <Play className="w-3 h-3" />
                {progress.last_position_seconds > 0 ? "Resume" : "Watch"}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quiz attempt row
// ---------------------------------------------------------------------------
function QuizAttemptRow_({ attempt }: { attempt: QuizAttemptRow }) {
  const pctColor =
    attempt.percentage >= 80
      ? "text-[#00C9B7]"
      : attempt.percentage >= 50
        ? "text-[#FF9B25]"
        : "text-red-400";

  const topic = attempt.mcq_set?.topic ?? attempt.library_video?.title ?? "General Quiz";

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold ${attempt.percentage >= 80
            ? "bg-[#00C9B7]/10 text-[#00C9B7] border border-[#00C9B7]/30"
            : attempt.percentage >= 50
              ? "bg-[#FF9B25]/10 text-[#FF9B25] border border-[#FF9B25]/30"
              : "bg-red-500/10 text-red-400 border border-red-500/30"
          }`}
      >
        {attempt.percentage}%
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{topic}</p>
        <p className="text-[10px] text-muted-foreground">
          {attempt.score}/{attempt.total} correct · {formatDate(attempt.attempted_at)}
        </p>
      </div>
      <span className={`text-xs font-bold font-mono ${pctColor}`}>{attempt.percentage}%</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subject card
// ---------------------------------------------------------------------------
function SubjectCard({ subject }: { subject: SubjectProgress }) {
  return (
    <div className="glass-card rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-foreground">{subject.subject}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {subject.videosStarted} video{subject.videosStarted !== 1 ? "s" : ""} started
            {subject.videosCompleted > 0 && ` · ${subject.videosCompleted} completed`}
          </p>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground bg-[#0B101C] border border-border px-2 py-0.5 rounded-full">
          {formatSeconds(subject.studySeconds)}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">Avg. completion</span>
          <span className="text-[#00D4E8] font-mono">{subject.avgCompletion}%</span>
        </div>
        <ProgressBar pct={subject.avgCompletion} />
      </div>

      {subject.quizAvg > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Quiz average</span>
            <span
              className={`font-mono ${subject.quizAvg >= 80
                  ? "text-[#00C9B7]"
                  : subject.quizAvg >= 50
                    ? "text-[#FF9B25]"
                    : "text-red-400"
                }`}
            >
              {subject.quizAvg}%
            </span>
          </div>
          <ProgressBar
            pct={subject.quizAvg}
            color={
              subject.quizAvg >= 80 ? "#00C9B7" : subject.quizAvg >= 50 ? "#FF9B25" : "#FF5555"
            }
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard page
// ---------------------------------------------------------------------------
type Tab = "overview" | "videos" | "quiz" | "study" | "subjects";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Auth sync & auto-redirect unauthenticated users
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
      const stored = getStoredUser();
      setUser(stored);
      if (!stored) {
        router.replace("/login?redirect=/dashboard");
      }
    }, 0);
    const unsub = subscribeToAuthChanges((u) => {
      setUser(u);
      if (!u) {
        router.replace("/login?redirect=/dashboard");
      }
    });
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [router]);

  const [reloadKey, setReloadKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isMounted || !user) return;
    let cancelled = false;

    async function loadData(manual = false) {
      if (manual) {
        setIsRefreshing(true);
      }
      try {
        const res = await fetch(`/api/dashboard/metrics?_t=${Date.now()}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });
        const data = await res.json();
        if (cancelled) return;
        if (data.success) {
          setMetrics(data.metrics);
          setLastUpdated(new Date());
          setError(null);
        } else {
          if (res.status === 401) {
            setError("Please sign in to view your learning dashboard.");
          } else if (res.status === 503) {
            setError("Dashboard requires Supabase to be configured.");
          } else {
            setError(data.error || "Failed to load dashboard.");
          }
        }
      } catch {
        if (!cancelled) {
          setError("Network error. Please check your connection and try again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    }

    loadData();

    // Re-validate metrics when tab regains focus or visibility
    const handleRevalidate = () => {
      if (!document.hidden) {
        loadData();
      }
    };

    window.addEventListener("focus", handleRevalidate);
    document.addEventListener("visibilitychange", handleRevalidate);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleRevalidate);
      document.removeEventListener("visibilitychange", handleRevalidate);
    };
  }, [isMounted, user, reloadKey]);

  // Not mounted yet — SSR safe
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#00D4E8]" />
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-4">
        <div className="p-4 rounded-2xl bg-[#00D4E8]/10 border border-[#00D4E8]/20">
          <GraduationCap className="w-8 h-8 text-[#00D4E8]" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">My Learning Dashboard</h1>
          <p className="text-sm text-muted-foreground max-w-sm">
            Redirecting to sign in to access your learning dashboard...
          </p>
        </div>
        <Link href="/login?redirect=/dashboard">
          <Button className="bg-[#00D4E8] hover:bg-[#00D4E8]/90 text-[#050810] font-semibold rounded-full px-6">
            Sign In to Continue
          </Button>
        </Link>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
          {/* Header skeleton */}
          <div className="space-y-2">
            <div className="h-8 w-48 bg-[#1B2635] rounded-xl animate-pulse" />
            <div className="h-4 w-64 bg-[#1B2635]/60 rounded animate-pulse" />
          </div>
          {/* Cards skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 bg-[#1B2635] rounded-2xl animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-48 bg-[#1B2635] rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-4">
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-lg font-bold text-foreground">Could Not Load Dashboard</h2>
          <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
        </div>
        {error.includes("sign in") ? (
          <Link href="/login?redirect=/dashboard">
            <Button className="bg-[#00D4E8] hover:bg-[#00D4E8]/90 text-[#050810] font-semibold rounded-full">
              Sign In
            </Button>
          </Link>
        ) : (
          <Button
            onClick={() => {
              setLoading(true);
              setReloadKey((k) => k + 1);
            }}
            variant="outline"
            className="border-border text-foreground gap-2 rounded-full"
          >
            <RotateCw className="w-4 h-4" /> Retry
          </Button>
        )}
      </div>
    );
  }

  if (!metrics) return null;

  const isEmpty =
    metrics.videosStarted === 0 &&
    metrics.quizAttempts.length === 0 &&
    metrics.totalStudyTimeSeconds === 0;

  const bestScore =
    metrics.quizAttempts.length > 0
      ? Math.max(...metrics.quizAttempts.map((q) => q.percentage))
      : 0;

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "videos", label: "Videos", icon: Play },
    { id: "quiz", label: "Quizzes", icon: Brain },
    { id: "study", label: "Study Time", icon: Clock },
    { id: "subjects", label: "Subjects", icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-background pb-24 pt-20 relative">
      {/* Background aurora */}
      <div className="aurora-bg" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Page Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="section-label mb-3">
              <span className="dot" />
              LEARNING DASHBOARD
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Welcome back,{" "}
              <span className="gradient-cyan-teal">
                {user.name.split(" ")[0]}
              </span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track your progress across videos, quizzes, and study sessions.
            </p>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-auto">
            {lastUpdated && (
              <span className="text-[11px] text-muted-foreground/70 font-mono">
                Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}
            <Button
              onClick={() => {
                setLoading(true);
                setReloadKey((k) => k + 1);
              }}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="text-xs border-border/80 text-muted-foreground hover:text-foreground gap-1.5 h-8 px-3 rounded-lg"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#00D4E8]" : ""}`} />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>

        {/* Database schema pending migration notice */}
        {metrics.schemaNotice && (
          <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-300">Database Schema Notice</p>
              <p className="text-amber-200/90 leading-relaxed">{metrics.schemaNotice}</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div className="glass-card rounded-2xl p-10 text-center space-y-4 mb-8 border border-[#00D4E8]/10">
            <div className="w-16 h-16 rounded-3xl bg-[#00D4E8]/10 border border-[#00D4E8]/20 flex items-center justify-center mx-auto">
              <GraduationCap className="w-7 h-7 text-[#00D4E8]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Your Learning Journey Starts Here</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Watch a lesson or complete a quiz to see your progress. Your stats will appear here as you learn.
              </p>
            </div>
            <Link href="/library">
              <Button className="bg-[#00D4E8] hover:bg-[#00D4E8]/90 text-[#050810] font-semibold rounded-full px-6 gap-2">
                <Play className="w-4 h-4" /> Browse Video Library
              </Button>
            </Link>
          </div>
        )}

        {/* Overview Stats — always visible */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
          <StatCard
            icon={Play}
            label="Videos Started"
            value={metrics.videosStarted}
            color="cyan"
          />
          <StatCard
            icon={CheckCircle2}
            label="Videos Completed"
            value={metrics.videosCompleted}
            color="teal"
          />
          <StatCard
            icon={TrendingUp}
            label="Avg. Completion"
            value={`${Math.round(metrics.avgVideoCompletion)}%`}
            color="violet"
          />
          <StatCard
            icon={Brain}
            label="Quiz Average"
            value={metrics.quizAttempts.length > 0 ? `${Math.round(metrics.quizAverage)}%` : "—"}
            sub={metrics.quizAttempts.length > 0 ? `${metrics.quizAttempts.length} attempt${metrics.quizAttempts.length !== 1 ? "s" : ""}` : "No quizzes yet"}
            color="orange"
          />
          <StatCard
            icon={Clock}
            label="Study Time"
            value={formatSeconds(metrics.totalStudyTimeSeconds)}
            color="cyan"
          />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-[#0B101C]/80 border border-border rounded-full px-2 py-1.5 overflow-x-auto mb-6 backdrop-blur-md w-fit">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              id={`dashboard-tab-${id}`}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap ${activeTab === id
                  ? "bg-[#00D4E8]/10 text-[#00D4E8] shadow-[0_0_10px_rgba(0,212,232,0.15)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-[#101625]"
                }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* ===== TAB: OVERVIEW ===== */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Continue Learning */}
            <div className="glass-card rounded-2xl p-5">
              <SectionHeader icon={Play} title="Continue Learning" count={metrics.recentVideos.length} />
              {metrics.recentVideos.length === 0 ? (
                <EmptyState
                  icon={Play}
                  title="No videos watched yet"
                  message="Start watching a video from the library to track your progress here."
                />
              ) : (
                <div className="space-y-3">
                  {metrics.recentVideos.map((v) => (
                    <VideoProgressCard key={v.id} progress={v} isRecent />
                  ))}
                  {metrics.allVideoProgress.length > 5 && (
                    <button
                      onClick={() => setActiveTab("videos")}
                      className="w-full text-xs text-[#00D4E8] hover:text-[#00C9B7] transition-colors flex items-center justify-center gap-1 py-1"
                    >
                      View all {metrics.allVideoProgress.length} videos <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 7-Day Study Chart + Quiz Snapshot */}
            <div className="space-y-4">
              <div className="glass-card rounded-2xl p-5">
                <SectionHeader icon={Calendar} title="7-Day Study Activity" />
                <StudyBarChart daily={metrics.dailyStudySeconds} />
                <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">This week</span>
                  <span className="text-[#00D4E8] font-mono font-semibold">
                    {formatSeconds(
                      Object.values(metrics.dailyStudySeconds).reduce((a, b) => a + b, 0)
                    )}
                  </span>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-5">
                <SectionHeader icon={Award} title="Quiz Summary" />
                {metrics.quizAttempts.length === 0 ? (
                  <EmptyState
                    icon={Brain}
                    title="No quizzes taken"
                    message="Open a video and click 'Interactive Quiz' to test your knowledge."
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-[#0B101C] rounded-xl p-3 border border-border">
                        <p className="text-lg font-bold text-[#00D4E8]">{Math.round(metrics.quizAverage)}%</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Average</p>
                      </div>
                      <div className="bg-[#0B101C] rounded-xl p-3 border border-border">
                        <p className="text-lg font-bold text-[#00C9B7]">{bestScore}%</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Best</p>
                      </div>
                      <div className="bg-[#0B101C] rounded-xl p-3 border border-border">
                        <p className="text-lg font-bold text-foreground">{metrics.quizAttempts.length}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Taken</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Score trend</span>
                      <ScoreTrend attempts={metrics.quizAttempts} />
                    </div>
                    <button
                      onClick={() => setActiveTab("quiz")}
                      className="w-full text-xs text-[#00D4E8] hover:text-[#00C9B7] transition-colors flex items-center justify-center gap-1 py-1"
                    >
                      See all attempts <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== TAB: VIDEOS ===== */}
        {activeTab === "videos" && (
          <div className="glass-card rounded-2xl p-5">
            <SectionHeader icon={Play} title="Video Learning Progress" count={metrics.allVideoProgress.length} />
            {metrics.allVideoProgress.length === 0 ? (
              <EmptyState
                icon={Play}
                title="No videos watched yet"
                message="Head to the 3D Video Library and start a lesson. Your progress will appear here."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {metrics.allVideoProgress.map((v) => (
                  <div key={v.id} className="glass-card rounded-xl p-4 border border-border/50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">
                          {v.library_video?.title ?? "Unknown Video"}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {v.library_video?.subject ?? ""}
                        </p>
                      </div>
                      {v.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-[#00C9B7] flex-shrink-0 ml-2" />
                      ) : (
                        <span className="text-[10px] font-mono text-[#00D4E8] ml-2 flex-shrink-0">
                          {Math.round(Number(v.completion_pct))}%
                        </span>
                      )}
                    </div>

                    <ProgressBar
                      pct={Math.round(Number(v.completion_pct))}
                      color={v.completed ? "#00C9B7" : "#00D4E8"}
                      className="mb-2"
                    />

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{formatSeconds(v.watched_seconds)} watched</span>
                      <span>
                        {v.completed
                          ? `Completed ${formatRelativeDate(v.completed_at!)}`
                          : `Last: ${formatRelativeDate(v.last_watched_at)}`}
                      </span>
                    </div>

                    <Link
                      href={`/library/${v.video_id}${v.last_position_seconds > 0 ? `?t=${v.last_position_seconds}` : ""}`}
                      className="inline-flex items-center gap-1 text-[10px] text-[#00D4E8] hover:text-[#00C9B7] transition-colors mt-2"
                    >
                      <Play className="w-3 h-3" />
                      {v.completed ? "Rewatch" : "Resume"}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== TAB: QUIZ ===== */}
        {activeTab === "quiz" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-card rounded-2xl p-5">
              <SectionHeader icon={Brain} title="Quiz Performance" count={metrics.quizAttempts.length} />
              {metrics.quizAttempts.length === 0 ? (
                <EmptyState
                  icon={Brain}
                  title="No quiz attempts yet"
                  message="Open a video, go to the Interactive Quiz tab, answer all questions, and click Submit Quiz."
                />
              ) : (
                <div className="space-y-1">
                  {metrics.quizAttempts.map((a) => (
                    <QuizAttemptRow_ key={a.id} attempt={a} />
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="glass-card rounded-2xl p-5">
                <SectionHeader icon={Star} title="Stats" />
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Average score</span>
                    <span className="text-sm font-bold text-[#00D4E8]">
                      {metrics.quizAttempts.length > 0 ? `${Math.round(metrics.quizAverage)}%` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Best score</span>
                    <span className="text-sm font-bold text-[#00C9B7]">
                      {metrics.quizAttempts.length > 0 ? `${bestScore}%` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Total attempts</span>
                    <span className="text-sm font-bold text-foreground">{metrics.quizAttempts.length}</span>
                  </div>
                  {metrics.quizAttempts.length >= 2 && (
                    <div className="pt-3 border-t border-border/50">
                      <p className="text-[10px] text-muted-foreground mb-2">Score trend</p>
                      <ScoreTrend attempts={metrics.quizAttempts} />
                    </div>
                  )}
                </div>
              </div>

              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-[#FF9B25]" />
                  <span className="text-xs font-semibold text-foreground">Tip</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Aim for 80%+ to solidify your understanding. Retake quizzes to improve your score.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ===== TAB: STUDY TIME ===== */}
        {activeTab === "study" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="glass-card rounded-2xl p-5">
                <SectionHeader icon={Calendar} title="7-Day Activity" />
                <StudyBarChart daily={metrics.dailyStudySeconds} />
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="bg-[#0B101C] rounded-xl p-3 border border-border text-center">
                    <p className="text-lg font-bold text-[#00D4E8]">
                      {formatSeconds(
                        Object.values(metrics.dailyStudySeconds).reduce((a, b) => a + b, 0)
                      )}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">This week</p>
                  </div>
                  <div className="bg-[#0B101C] rounded-xl p-3 border border-border text-center">
                    <p className="text-lg font-bold text-foreground">
                      {formatSeconds(metrics.totalStudyTimeSeconds)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">All time</p>
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-5">
                <SectionHeader icon={Clock} title="Recent Sessions" count={metrics.studySessions.slice(0, 10).length} />
                {metrics.studySessions.length === 0 ? (
                  <EmptyState
                    icon={Clock}
                    title="No study sessions recorded"
                    message="Study session tracking starts automatically when you watch a video while signed in."
                  />
                ) : (
                  <div className="space-y-1">
                    {metrics.studySessions.slice(0, 10).map((s) => (
                      <div key={s.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                        <div className="w-8 h-8 rounded-lg bg-[#00D4E8]/10 border border-[#00D4E8]/20 flex items-center justify-center flex-shrink-0">
                          <Zap className="w-3.5 h-3.5 text-[#00D4E8]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground capitalize">{s.activity_type.replace("_", " ")}</p>
                          <p className="text-[10px] text-muted-foreground">{formatRelativeDate(s.started_at)}</p>
                        </div>
                        <span className="text-xs font-mono text-[#00D4E8]">
                          {formatSeconds(s.duration_seconds ?? 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="glass-card rounded-2xl p-5">
                <SectionHeader icon={Zap} title="How It's Tracked" />
                <div className="space-y-3 text-[11px] text-muted-foreground leading-relaxed">
                  <p>✓ Time is counted only while you are <strong className="text-foreground">actively watching</strong> a video.</p>
                  <p>✓ Tracking pauses when the tab is hidden or video is paused.</p>
                  <p>✓ Sessions shorter than 5 seconds are discarded.</p>
                  <p>✗ Simply opening a page does <strong className="text-foreground">not</strong> count as study time.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== TAB: SUBJECTS ===== */}
        {activeTab === "subjects" && (
          <div className="glass-card rounded-2xl p-5">
            <SectionHeader icon={BookOpen} title="Subject Progress" count={metrics.subjectProgress.length} />
            {metrics.subjectProgress.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No subject data yet"
                message="Watch a video or take a quiz to see your progress organized by subject."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {metrics.subjectProgress.map((s) => (
                  <SubjectCard key={s.subject} subject={s} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
