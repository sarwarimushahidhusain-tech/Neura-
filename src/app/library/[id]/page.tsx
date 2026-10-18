"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Clock,
  GraduationCap,
  Sparkles,
  FileText,
  BrainCircuit,
  Eye,
  Share2,
  AlertCircle,
  Play,
  RotateCw,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import InteractiveQuiz from "@/components/quiz/InteractiveQuiz";
import type { LibraryVideo } from "@/types/library";
import type { StudyNotes, McqSetSafe } from "@/types/phase4";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VideoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const videoId = resolvedParams.id;

  const [video, setVideo] = useState<LibraryVideo | null>(null);
  const [related, setRelated] = useState<LibraryVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState(false);

  // Tabs for Study Studio
  const [activeTab, setActiveTab] = useState<"overview" | "notes" | "quiz">("overview");

  // Study Notes state
  const [notes, setNotes] = useState<StudyNotes | null>(null);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);

  // Quiz state
  const [mcqSet, setMcqSet] = useState<McqSetSafe | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [quizKey, setQuizKey] = useState(0);

  // Copy share state
  const [copied, setCopied] = useState(false);

  // Fetch video data
  useEffect(() => {
    async function loadVideo() {
      setLoading(true);
      setError(null);
      setVideoError(false);

      try {
        const res = await fetch(`/api/library/videos/${videoId}`);
        const data = await res.json();

        if (data.success && data.video) {
          setVideo(data.video);
          setRelated(data.related || []);
        } else {
          setError(data.error || "Video not found.");
        }
      } catch {
        setError("Network error while loading video.");
      } finally {
        setLoading(false);
      }
    }

    loadVideo();
  }, [videoId]);

  // Generate study notes using OpenRouter API
  const handleGenerateNotes = useCallback(
    async (detailLevel: "quick" | "detailed") => {
      if (!video) return;
      setNotesLoading(true);
      setNotesError(null);
      setActiveTab("notes");

      try {
        const res = await fetch("/api/ai/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: video.topic || video.title,
            detailLevel,
            plan: {
              topic: video.topic,
              summary: video.description,
              targetAudience: video.educational_level,
              learningObjectives: [
                `Understand key principles of ${video.topic}`,
                `Analyze real-world scientific applications`,
                `Consolidate definitions and formulas related to ${video.subject}`,
              ],
              keyConcepts: video.tags || [video.subject, video.topic],
            },
          }),
        });

        const data = await res.json();
        if (data.success && data.notes) {
          setNotes(data.notes);
        } else {
          setNotesError(data.error || "Failed to generate study notes.");
        }
      } catch {
        setNotesError("Network error while generating notes.");
      } finally {
        setNotesLoading(false);
      }
    },
    [video]
  );

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground pt-24 px-4 sm:px-8 max-w-7xl mx-auto">
        <div className="space-y-6 animate-pulse">
          <div className="h-6 w-36 bg-muted rounded" />
          <div className="aspect-[16/9] w-full max-w-4xl bg-muted rounded-2xl" />
          <div className="h-8 w-2/3 bg-muted rounded" />
          <div className="h-4 w-1/3 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-background text-foreground pt-24 px-4 sm:px-8 max-w-4xl mx-auto text-center space-y-6">
        <div className="p-6 rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive max-w-md mx-auto space-y-3">
          <AlertCircle className="w-10 h-10 mx-auto" />
          <h2 className="text-lg font-bold">Video Unavailable</h2>
          <p className="text-xs">{error || "This educational video could not be loaded."}</p>
        </div>
        <Link href="/library">
          <Button variant="outline" className="border-border text-xs gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to 3D Library
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/library"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to 3D Video Library</span>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="text-xs border-border bg-card hover:bg-muted gap-1.5"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Copied Link!
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" /> Share Simulation
              </>
            )}
          </Button>
        </div>

        {/* Video Player & Main Metadata */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* HTML5 Video Player Container */}
            <div className="rounded-2xl overflow-hidden bg-black border border-border/80 shadow-2xl relative aspect-[16/9]">
              {!videoError ? (
                <video
                  src={video.video_url}
                  poster={video.thumbnail_url || undefined}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-contain"
                  onError={() => setVideoError(true)}
                >
                  <source src={video.video_url} type="video/mp4" />
                  Your browser does not support HTML5 video streaming.
                </video>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-950 text-slate-300">
                  <AlertCircle className="w-10 h-10 text-amber-400" />
                  <p className="text-sm font-medium">Video Stream Source Currently Unavailable</p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    The requested video file ({video.storage_path}) is awaiting storage synchronization. You can
                    still review verified curriculum metadata and generate study notes below.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVideoError(false)}
                    className="text-xs border-border"
                  >
                    <RotateCw className="w-3.5 h-3.5 mr-1.5" /> Retry Playback
                  </Button>
                </div>
              )}
            </div>

            {/* Video Header Details */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="default" className="bg-primary text-primary-foreground text-xs font-semibold">
                  {video.subject}
                </Badge>
                <Badge variant="secondary" className="text-xs flex items-center gap-1 font-medium">
                  <GraduationCap className="w-3.5 h-3.5" />
                  {video.educational_level.replace("_", " ")}
                </Badge>
                {video.duration_seconds > 0 && (
                  <Badge variant="outline" className="text-xs flex items-center gap-1 border-border">
                    <Clock className="w-3 h-3" />
                    {formatDuration(video.duration_seconds)}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> {video.views_count.toLocaleString()} views
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-snug">
                {video.title}
              </h1>

              <p className="text-sm text-foreground/85 leading-relaxed bg-card/40 p-4 rounded-xl border border-border/50">
                {video.description}
              </p>

              {/* Tags */}
              {video.tags && video.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {video.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2.5 py-1 rounded-lg bg-card border border-border/60 text-muted-foreground font-mono"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Study Studio Tabs: Notes & MCQs */}
            <div className="pt-6 border-t border-border/60 space-y-6">
              <div className="flex items-center justify-between border-b border-border/60 pb-px">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("overview")}
                    className={`px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
                      activeTab === "overview"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <BookOpen className="w-4 h-4" /> Curriculum Details
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("notes")}
                    className={`px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
                      activeTab === "notes"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <FileText className="w-4 h-4" /> AI Study Notes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("quiz");
                      setQuizTriggered(true);
                    }}
                    className={`px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
                      activeTab === "quiz"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <BrainCircuit className="w-4 h-4" /> Interactive Quiz
                  </button>
                </div>
              </div>

              {/* TAB 1: Overview */}
              {activeTab === "overview" && (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Card className="bg-card border-border p-4 rounded-xl space-y-2">
                      <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                        Topic Focus
                      </span>
                      <p className="text-sm font-medium text-foreground">{video.topic}</p>
                      <p className="text-xs text-muted-foreground">
                        Structured under the {video.subject} standard curriculum syllabus.
                      </p>
                    </Card>

                    <Card className="bg-card border-border p-4 rounded-xl space-y-2">
                      <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                        Recommended Audience
                      </span>
                      <p className="text-sm font-medium text-foreground capitalize">
                        {video.educational_level.replace("_", " ")} Students
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Calibrated for conceptual understanding and 3D geometric clarity.
                      </p>
                    </Card>
                  </div>

                  {/* Actions to launch notes / quiz */}
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="space-y-0.5 text-center sm:text-left">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-primary" /> Test your knowledge or review notes
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Instant revision notes and practice quizzes powered by Neura AI.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleGenerateNotes("quick")}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                      >
                        Generate Notes
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setActiveTab("quiz");
                          setQuizTriggered(true);
                        }}
                        className="border-border text-xs"
                      >
                        Start Quiz
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Notes */}
              {activeTab === "notes" && (
                <div className="space-y-5">
                  {/* Disclaimer banner */}
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>
                      Educational study notes are synthesized by Neura AI from the verified topic curriculum and syllabus,
                      not transcribed directly from video pixels.
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      size="sm"
                      onClick={() => handleGenerateNotes("quick")}
                      disabled={notesLoading}
                      className="bg-primary text-primary-foreground text-xs gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {notesLoading ? "Synthesizing..." : "Quick Revision Notes"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleGenerateNotes("detailed")}
                      disabled={notesLoading}
                      className="border-border text-xs"
                    >
                      Detailed Study Notes
                    </Button>
                  </div>

                  {notesError && (
                    <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                      {notesError}
                    </div>
                  )}

                  {notes && (
                    <Card className="bg-card border-border p-6 rounded-2xl space-y-6">
                      <div className="border-b border-border/60 pb-3">
                        <h3 className="text-lg font-bold text-foreground">{notes.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Generated for {video.topic} • {notes.detailLevel} format
                        </p>
                      </div>

                      {/* Learning Objectives */}
                      {notes.learningObjectives && notes.learningObjectives.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs uppercase tracking-wider font-semibold text-primary">
                            Learning Objectives
                          </h4>
                          <ul className="text-xs text-foreground/80 space-y-1 list-disc list-inside">
                            {notes.learningObjectives.map((obj, i) => (
                              <li key={i}>{obj}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Main Concepts */}
                      {notes.mainConcepts && notes.mainConcepts.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="text-xs uppercase tracking-wider font-semibold text-primary">
                            Core Scientific Concepts
                          </h4>
                          <div className="grid gap-3">
                            {notes.mainConcepts.map((mc, i) => (
                              <div key={i} className="p-3.5 rounded-xl bg-background/60 border border-border/60 space-y-1.5">
                                <p className="text-xs font-bold text-foreground">{mc.concept}</p>
                                <p className="text-xs text-muted-foreground leading-relaxed">{mc.explanation}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Key Takeaways */}
                      {notes.keyTakeaways && notes.keyTakeaways.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs uppercase tracking-wider font-semibold text-primary">
                            Key Takeaways
                          </h4>
                          <ul className="text-xs text-foreground/80 space-y-1 list-disc list-inside">
                            {notes.keyTakeaways.map((kt, i) => (
                              <li key={i}>{kt}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Revision Summary */}
                      {notes.revisionSummary && (
                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-1">
                          <h5 className="text-xs font-semibold text-primary">Revision Summary</h5>
                          <p className="text-xs text-foreground/90 leading-relaxed">{notes.revisionSummary}</p>
                        </div>
                      )}
                    </Card>
                  )}

                  {!notes && !notesLoading && (
                    <div className="p-8 text-center border border-dashed border-border rounded-2xl space-y-3">
                      <FileText className="w-8 h-8 mx-auto text-muted-foreground/60" />
                      <p className="text-xs text-muted-foreground">
                        Click above to generate curriculum-aligned revision notes for this 3D simulation.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Quiz */}
              {activeTab === "quiz" && (
                <div className="space-y-4">
                  {/* Disclaimer banner */}
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>
                      Practice MCQs are generated to test mastery of {video.topic}. Answers are scored in real time.
                    </span>
                  </div>

                  {quizTriggered && (
                    <InteractiveQuiz
                      topic={video.topic || video.title}
                      difficulty={
                        video.educational_level === "undergraduate"
                          ? "hard"
                          : video.educational_level === "middle_school"
                          ? "easy"
                          : "medium"
                      }
                      count={5}
                      onComplete={() => {}}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar: Related Videos */}
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Play className="w-4 h-4 text-primary fill-current" /> Related 3D Videos
            </h3>

            {related.length === 0 ? (
              <p className="text-xs text-muted-foreground">No related videos found in {video.subject}.</p>
            ) : (
              <div className="space-y-4">
                {related.map((rel) => (
                  <Link
                    key={rel.id}
                    href={`/library/${rel.id}`}
                    className="group block p-3 rounded-xl bg-card border border-border/60 hover:border-primary/50 transition-all shadow-sm hover:shadow-md"
                  >
                    <div className="flex gap-3">
                      <div className="w-24 aspect-[16/9] relative rounded-lg overflow-hidden bg-slate-900 shrink-0">
                        {rel.thumbnail_url ? (
                          <Image
                            src={rel.thumbnail_url}
                            alt={rel.title}
                            fill
                            sizes="96px"
                            className="object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Play className="w-4 h-4" />
                          </div>
                        )}
                        {rel.duration_seconds > 0 && (
                          <span className="absolute bottom-1 right-1 text-[9px] bg-black/80 px-1 py-0.2 rounded font-mono text-white">
                            {formatDuration(rel.duration_seconds)}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <span className="text-[10px] text-primary font-semibold block">{rel.subject}</span>
                        <h4 className="text-xs font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                          {rel.title}
                        </h4>
                        <span className="text-[10px] text-muted-foreground block">
                          {rel.views_count.toLocaleString()} views
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* AI Generator Promo */}
            <div className="p-4 rounded-xl border border-border/80 bg-card/60 space-y-2 text-center">
              <p className="text-xs font-semibold text-foreground">Want to generate custom AI videos?</p>
              <p className="text-[11px] text-muted-foreground">
                Turn any custom science or math prompt into multi-model AI video generations.
              </p>
              <Link href="/create" className="block pt-1">
                <Button variant="outline" size="sm" className="w-full text-xs border-primary/30 text-primary">
                  Open Creator Studio
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
