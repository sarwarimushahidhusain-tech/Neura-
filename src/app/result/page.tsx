"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import InteractiveQuiz from "@/components/quiz/InteractiveQuiz";
import {
  Download,
  RefreshCw,
  Plus,
  FileText,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Film,
  HelpCircle,
  Copy,
  Check,
  Sparkles,
  Loader2,
  AlertCircle,
  LayoutList,
  ClipboardList,
  X,
} from "lucide-react";
import type { EducationalPlan } from "@/types/ai";
import type { StudyNotes, McqSetSafe, NoteDetailLevel, McqDifficulty } from "@/types/phase4";
import type { LibraryVideo } from "@/types/library";
import { useVideoTracker } from "@/lib/dashboard/useVideoTracker";
import { useStudySession } from "@/lib/dashboard/useStudySession";
import { getStoredUser } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------
type Tab = "video" | "notes" | "mcqs" | "summary";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Notes Tab
// ---------------------------------------------------------------------------
interface NotesTabProps {
  plan: EducationalPlan | null;
  topic: string;
  masterPrompt: string;
}

function NotesTab({ plan, topic, masterPrompt }: NotesTabProps) {
  const [notes, setNotes] = useState<StudyNotes | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailLevel, setDetailLevel] = useState<NoteDetailLevel>("detailed");

  const canGenerate = Boolean(plan);

  const handleGenerate = useCallback(async () => {
    if (!plan || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, plan, masterPrompt, detailLevel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate notes.");
      setNotes(data.notes as StudyNotes);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [plan, topic, masterPrompt, detailLevel, loading]);

  if (!canGenerate) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <BookOpen className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          Generate a lesson plan first to enable study notes.
        </p>
        <Link href="/create">
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <Sparkles className="w-4 h-4" /> Create Plan
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Mode:</span>
          {(["quick", "detailed"] as NoteDetailLevel[]).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setDetailLevel(lvl)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                detailLevel === lvl
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {lvl === "quick" ? "Quick Revision" : "Detailed Study"}
            </button>
          ))}
        </div>
        <Button
          onClick={handleGenerate}
          disabled={loading}
          size="sm"
          className="ml-auto bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-8 text-xs"
        >
          {loading ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
          ) : (
            <><Sparkles className="w-3.5 h-3.5" /> {notes ? "Regenerate" : "Generate Notes"}</>
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {!notes && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <BookOpen className="w-10 h-10 text-primary/30" />
          <p className="text-sm text-muted-foreground max-w-sm">
            Click &ldquo;Generate Notes&rdquo; to produce {detailLevel === "quick" ? "concise revision" : "comprehensive study"} notes from the lesson plan.
          </p>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Generating notes via OpenRouter…</p>
        </div>
      )}

      {notes && !loading && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-foreground">{notes.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {notes.detailLevel === "quick" ? "Quick Revision" : "Detailed Study"} Notes •{" "}
                {new Date(notes.generatedAt).toLocaleTimeString()}
              </p>
            </div>
            <CopyButton
              text={[
                notes.title,
                "",
                "Learning Objectives:",
                ...notes.learningObjectives.map((o) => `• ${o}`),
                "",
                "Key Definitions:",
                ...notes.definitions.map((d) => `${d.term}: ${d.definition}`),
                "",
                "Key Takeaways:",
                ...notes.keyTakeaways.map((t) => `• ${t}`),
                "",
                "Summary:",
                notes.revisionSummary,
              ].join("\n")}
            />
          </div>

          {/* Learning Objectives */}
          {notes.learningObjectives.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                Learning Objectives
              </h4>
              <ul className="space-y-1.5 text-xs text-foreground/90 list-disc list-inside">
                {notes.learningObjectives.map((obj, i) => <li key={i}>{obj}</li>)}
              </ul>
            </section>
          )}

          <Separator />

          {/* Definitions */}
          {notes.definitions.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
                Key Definitions
              </h4>
              <div className="space-y-2">
                {notes.definitions.map((d, i) => (
                  <div key={i} className="p-3 rounded-xl bg-background/50 border border-border/60">
                    <span className="font-semibold text-xs text-foreground">{d.term}</span>
                    <span className="text-muted-foreground text-xs mx-1">—</span>
                    <span className="text-xs text-foreground/80">{d.definition}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Main Concepts */}
          {notes.mainConcepts.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
                Main Concepts
              </h4>
              <div className="space-y-3">
                {notes.mainConcepts.map((c, i) => (
                  <div key={i} className="p-4 rounded-xl border border-border/60 bg-background/40 space-y-2">
                    <p className="text-sm font-semibold text-foreground">{c.concept}</p>
                    <p className="text-xs text-foreground/80 leading-relaxed">{c.explanation}</p>
                    {c.examples.length > 0 && (
                      <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                        {c.examples.map((ex, j) => <li key={j}>{ex}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Step-by-Step */}
          {notes.stepByStepExplanations.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
                Step-by-Step Explanation
              </h4>
              <ol className="space-y-2">
                {notes.stepByStepExplanations.map((step, i) => (
                  <li key={i} className="flex gap-3 text-xs text-foreground/90">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </section>
          )}

          <Separator />

          {/* Key Takeaways */}
          {notes.keyTakeaways.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                Key Takeaways
              </h4>
              <ul className="space-y-1.5">
                {notes.keyTakeaways.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground/90">
                    <span className="text-primary mt-0.5">▸</span> {t}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Revision Summary */}
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">
              Revision Summary
            </h4>
            <p className="text-xs text-foreground/90 leading-relaxed">{notes.revisionSummary}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MCQs Tab
// ---------------------------------------------------------------------------
interface McqsTabProps {
  plan: EducationalPlan | null;
  topic: string;
  libraryVideo?: LibraryVideo | null;
}

function McqsTab({ plan, topic, libraryVideo }: McqsTabProps) {
  const [mcqSet, setMcqSet] = useState<McqSetSafe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState<McqDifficulty>("mixed");
  const [quizKey, setQuizKey] = useState(0);

  const canGenerate = Boolean(plan);

  const handleGenerate = useCallback(async () => {
    if (!plan || loading) return;
    setLoading(true);
    setError(null);
    setMcqSet(null);
    try {
      const res = await fetch("/api/ai/mcqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, plan, numQuestions, difficulty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate MCQs.");
      setMcqSet(data.mcqSet as McqSetSafe);
      setQuizKey((k) => k + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [plan, topic, numQuestions, difficulty, loading]);

  if (!canGenerate) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <HelpCircle className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          Generate a lesson plan first to enable MCQ generation.
        </p>
        <Link href="/create">
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <Sparkles className="w-4 h-4" /> Create Plan
          </Button>
        </Link>
      </div>
    );
  }

  const difficulties: { value: McqDifficulty; label: string }[] = [
    { value: "easy", label: "Easy" },
    { value: "medium", label: "Medium" },
    { value: "hard", label: "Hard" },
    { value: "mixed", label: "Mixed" },
  ];

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border pb-4">
        {/* Difficulty */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">Difficulty:</span>
          {difficulties.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setDifficulty(value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                difficulty === value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Number of questions */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Questions:</span>
          {[3, 5, 10].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNumQuestions(n)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                numQuestions === n
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        <Button
          onClick={handleGenerate}
          disabled={loading}
          size="sm"
          className="ml-auto bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-8 text-xs"
        >
          {loading ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
          ) : (
            <><Sparkles className="w-3.5 h-3.5" /> {mcqSet ? "New Quiz" : "Generate Quiz"}</>
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {!mcqSet && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <HelpCircle className="w-10 h-10 text-primary/30" />
          <p className="text-sm text-muted-foreground max-w-sm">
            Click &ldquo;Generate Quiz&rdquo; to create {numQuestions} {difficulty === "mixed" ? "mixed-difficulty" : difficulty} MCQs from the lesson plan.
          </p>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Generating quiz via OpenRouter…</p>
        </div>
      )}

      {mcqSet && !loading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{mcqSet.totalQuestions}</span> questions •{" "}
              {mcqSet.difficulty}
            </div>
            <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-primary/5">
              Quiz Ready
            </Badge>
          </div>
          <InteractiveQuiz
            key={quizKey}
            mcqSet={mcqSet}
            onRetake={() => setQuizKey((k) => k + 1)}
            videoId={libraryVideo?.id}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary Tab (Lesson Plan)
// ---------------------------------------------------------------------------
function SummaryTab({ plan }: { plan: EducationalPlan | null }) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <LayoutList className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No lesson plan available.</p>
        <Link href="/create">
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <Sparkles className="w-4 h-4" /> Create Plan
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="text-base font-semibold text-foreground">
          Scene-by-Scene Animation Choreography
        </h3>
        <Badge variant="outline" className="text-xs font-mono">
          {plan.scenes.length} Scenes
        </Badge>
      </div>

      <div className="space-y-4">
        {plan.scenes.map((scene) => (
          <div
            key={scene.sceneNumber}
            className="p-4 rounded-xl border border-border/60 bg-background/40 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">
                Scene {scene.sceneNumber}: {scene.title}
              </span>
              <span className="text-xs font-mono text-muted-foreground">{scene.durationSeconds}s</span>
            </div>
            <p className="text-xs text-foreground/90 leading-relaxed">{scene.description}</p>
            <div className="grid sm:grid-cols-2 gap-2 text-[11px] text-muted-foreground">
              <div><strong>Camera:</strong> {scene.cameraAngleAndMovement}</div>
              <div><strong>Motion:</strong> {scene.animationActions}</div>
              <div><strong>Objects:</strong> {scene.visualObjects.join(", ")}</div>
              <div><strong>Lighting:</strong> {scene.lightingAndRenderStyle}</div>
            </div>
            <div className="bg-primary/5 p-2.5 rounded-lg border border-primary/20 text-xs text-foreground/90 italic">
              Narration: &ldquo;{scene.narration}&rdquo;
            </div>
          </div>
        ))}
      </div>

      {/* Embedded plan quiz questions */}
      {plan.quizQuestions && plan.quizQuestions.length > 0 && (
        <div className="pt-4 border-t border-border space-y-4">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-primary" />
            Knowledge Check (Lesson Plan)
          </h4>
          <div className="space-y-3">
            {plan.quizQuestions.map((q, qIndex) => {
              const selAns = selectedAnswers[qIndex];
              const hasAnswered = selAns !== undefined;
              return (
                <div key={qIndex} className="p-4 rounded-xl border border-border bg-background/50 space-y-2">
                  <p className="text-xs font-medium text-foreground">
                    {qIndex + 1}. {q.question}
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2 pt-1">
                    {q.options.map((opt, optIndex) => {
                      const isChosen = selAns === optIndex;
                      const isCorrect = optIndex === q.correctIndex;
                      return (
                        <button
                          key={optIndex}
                          type="button"
                          onClick={() =>
                            setSelectedAnswers((prev) => ({ ...prev, [qIndex]: optIndex }))
                          }
                          className={`p-2 rounded-lg text-xs text-left transition-colors border ${
                            hasAnswered && isCorrect
                              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                              : hasAnswered && isChosen && !isCorrect
                              ? "border-rose-500/50 bg-rose-500/10 text-rose-300"
                              : "border-border hover:border-primary/40 bg-card text-foreground"
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {hasAnswered && (
                    <p className="text-[11px] text-muted-foreground pt-1 italic">
                      Explanation: {q.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// No Match Modal
// ---------------------------------------------------------------------------
function NoMatchModal({
  alternatives,
  onClose,
}: {
  alternatives: LibraryVideo[];
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "rgba(5,8,16,0.85)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        style={{
          background: "#0B101C",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20,
          maxWidth: 540,
          width: "100%",
          padding: "2rem",
          position: "relative",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            padding: "4px 8px",
            cursor: "pointer",
            color: "rgba(154,168,188,0.7)",
          }}
        >
          <X size={16} />
        </button>

        {/* Icon */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "rgba(149,101,245,0.12)",
              border: "1px solid rgba(149,101,245,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
            }}
          >
            🔍
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#F5F7FC", marginBottom: 2 }}>
              We couldn&apos;t find a suitable video yet
            </h3>
            <p style={{ fontSize: 12, color: "rgba(154,168,188,0.7)" }}>
              Your educational blueprint is ready. Here are similar available lessons you can explore:
            </p>
          </div>
        </div>

        {/* Alternatives */}
        {alternatives.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(154,168,188,0.5)", marginBottom: 10 }}>
              Similar Videos You Can Explore
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {alternatives.map((v) => (
                <Link
                  key={v.id}
                  href={`/library/${v.id}`}
                  onClick={onClose}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.07)",
                    background: "rgba(255,255,255,0.02)",
                    textDecoration: "none",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "rgba(0,212,232,0.08)",
                      border: "1px solid rgba(0,212,232,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Film size={16} color="#00D4E8" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#F5F7FC", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {v.title}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(154,168,188,0.6)" }}>
                      {v.subject} · {Math.round(v.duration_seconds / 60)}m
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(0,212,232,0.7)", fontFamily: "monospace" }}>→</div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* CTA row */}
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/create" style={{ flex: 1 }}>
            <button
              style={{
                width: "100%",
                padding: "10px 16px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)",
                color: "rgba(154,168,188,0.8)",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
              }}
            >
              ← Try Another Topic
            </button>
          </Link>
          <Link href="/library" style={{ flex: 1 }}>
            <button
              style={{
                width: "100%",
                padding: "10px 16px",
                borderRadius: 10,
                border: "1px solid rgba(0,212,232,0.3)",
                background: "rgba(0,212,232,0.1)",
                color: "#00D4E8",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                fontWeight: 600,
              }}
            >
              Browse Full Library →
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pro Upgrade Modal
// ---------------------------------------------------------------------------
function ProUpgradeModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [waitlistJoined, setWaitlistJoined] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "rgba(5,8,16,0.85)",
        backdropFilter: "blur(14px)",
      }}
    >
      <div
        style={{
          background: "#0B1020",
          border: "1px solid rgba(0,212,232,0.25)",
          borderRadius: 20,
          maxWidth: 520,
          width: "100%",
          padding: "2rem",
          position: "relative",
          boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 40px rgba(0,212,232,0.1)",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            padding: "4px 8px",
            cursor: "pointer",
            color: "rgba(154,168,188,0.7)",
          }}
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "rgba(0,212,232,0.12)",
              border: "1px solid rgba(0,212,232,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#00D4E8",
            }}
          >
            <Sparkles size={24} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontFamily: "monospace", color: "#00D4E8", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              NEURA PRO MEMBERSHIP
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: "#F5F7FC" }}>
              Upgrade to NEURA Pro
            </h3>
          </div>
        </div>

        <p style={{ fontSize: 13, color: "rgba(154,168,188,0.85)", lineHeight: 1.6, marginBottom: 20 }}>
          Unlock additional video generation capacity, priority GPU inference queues, and advanced pedagogical creation tools.
        </p>

        {/* Planned Benefits */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {[
            {
              icon: "⚡",
              title: "Expanded Generation Limit",
              desc: "Generate additional cinematic 3D lessons every month with dedicated GPU capacity.",
            },
            {
              icon: "🎬",
              title: "Priority 1080p Rendering",
              desc: "Ultra high-definition video synthesis with faster queue prioritization.",
            },
            {
              icon: "📚",
              title: "Unlimited Curated Library",
              desc: "Full-length private streaming across all verified subjects and simulations.",
            },
            {
              icon: "🧠",
              title: "Comprehensive Study Packs",
              desc: "Instant MCQ quizzes, lesson summaries, and printable study revisions.",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#F5F7FC" }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 11, color: "rgba(154,168,188,0.7)", lineHeight: 1.4 }}>
                  {item.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Transparent payment notice */}
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(0,212,232,0.05)",
            border: "1px solid rgba(0,212,232,0.15)",
            fontSize: 11,
            color: "rgba(154,168,188,0.8)",
            lineHeight: 1.5,
            marginBottom: 20,
          }}
        >
          ℹ <strong>Notice:</strong> Billing and payment processing are coming soon. Subscriptions will be securely processed through server-side verification when the payment gateway goes live.
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          {waitlistJoined ? (
            <div
              style={{
                flex: 1,
                padding: "11px 16px",
                borderRadius: 12,
                background: "rgba(52,211,153,0.15)",
                border: "1px solid rgba(52,211,153,0.3)",
                color: "#34D399",
                fontSize: 13,
                fontWeight: 600,
                textAlign: "center",
              }}
            >
              ✓ You&apos;re on the Pro waitlist! We will notify you when live.
            </div>
          ) : (
            <button
              onClick={() => setWaitlistJoined(true)}
              style={{
                flex: 1,
                padding: "11px 16px",
                borderRadius: 12,
                border: "1px solid rgba(0,212,232,0.4)",
                background: "linear-gradient(90deg, #00D4E8, #00B4C8)",
                color: "#050810",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 0 20px rgba(0,212,232,0.3)",
              }}
            >
              Join Pro Waitlist
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              padding: "11px 16px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.04)",
              color: "rgba(154,168,188,0.9)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Video Tab
// ---------------------------------------------------------------------------
function VideoTab({
  videoUrl,
  plan,
  masterPrompt,
  libraryVideo,
  isCreditsExhausted,
  onOpenUpgrade,
  onTryAgainLater,
}: {
  videoUrl: string | null;
  plan: EducationalPlan | null;
  topic?: string;
  masterPrompt: string;
  libraryVideo?: LibraryVideo | null;
  isCreditsExhausted?: boolean;
  onOpenUpgrade?: () => void;
  onTryAgainLater?: () => void;
}) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Authenticated state for tracking
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAuthenticated(Boolean(getStoredUser()));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Hook video playback progress tracking
  useVideoTracker(videoRef, {
    videoId: libraryVideo?.id || "",
    videoDurationSeconds: libraryVideo?.duration_seconds || 0,
  });

  // Hook active study session tracking
  useStudySession({
    videoId: libraryVideo?.id,
    activityType: "video_watch",
    enabled: isAuthenticated && Boolean(libraryVideo?.id),
  });

  useEffect(() => {
    if (videoUrl && videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // If browser policy requires user interaction for sound, mute and play automatically
          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.play().catch(() => {});
          }
        });
      }
    }
  }, [videoUrl]);

  const handleCopy = () => {
    navigator.clipboard.writeText(masterPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Curated Visual Content badge */}
      {libraryVideo && videoUrl && !videoError && !isCreditsExhausted && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-primary/20 bg-primary/5">
          <Film className="w-4 h-4 text-primary shrink-0" />
          <span className="text-xs font-semibold text-primary">Curated Visual Experience</span>
          <Badge variant="outline" className="border-primary/30 text-primary text-[10px] font-mono bg-primary/10">
            {libraryVideo.subject}
          </Badge>
          <span className="text-xs text-muted-foreground ml-auto">
            {libraryVideo.title}
          </span>
        </div>
      )}

      {/* Video player / Credit Exhaustion Screen / Fallback */}
      <Card className="bg-[#0B1020] border-slate-800 overflow-hidden shadow-2xl p-1">
        <div className="rounded-xl overflow-hidden relative">
          {isCreditsExhausted ? (
            /* Premium Credit Exhaustion Screen */
            <div className="aspect-[16/9] relative flex items-center justify-center bg-gradient-to-br from-[#071D28] via-[#05111B] to-[#040C14] p-6 text-center">
              <div className="absolute inset-0 neura-grid-dark opacity-20 pointer-events-none" />
              <div className="relative z-10 max-w-lg space-y-4 flex flex-col items-center">
                {/* Glowing Spark / Credit Limit Icon */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00D4E8]/20 to-[#9565F5]/20 border border-[#00D4E8]/40 flex items-center justify-center text-[#00D4E8] shadow-[0_0_30px_rgba(0,212,232,0.35)] animate-in zoom-in duration-300">
                  <Sparkles className="w-8 h-8 text-[#00D4E8]" />
                </div>

                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#00D4E8]/30 bg-[#00D4E8]/10 text-[#00D4E8] text-[10px] font-mono tracking-wider uppercase mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00D4E8] animate-pulse" />
                    GENERATION LIMIT REACHED
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                    Your Video Credits Are Over!
                  </h3>
                  <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
                    You&apos;ve used all your available video-generation credits. Upgrade to NEURA Pro to unlock additional video-generation capacity and continue creating cinematic educational videos.
                  </p>
                </div>

                <div className="flex flex-col items-center gap-3 pt-2">
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Button
                      size="sm"
                      onClick={onOpenUpgrade}
                      className="h-10 px-6 text-xs font-bold bg-gradient-to-r from-[#00D4E8] to-[#00B4C8] hover:from-[#00E5FA] hover:to-[#00D4E8] text-slate-950 shadow-[0_0_25px_rgba(0,212,232,0.35)] transition-all gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Upgrade to Pro Plan
                    </Button>
                    <Link href="/pricing">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10 px-5 text-xs font-semibold border-[#00D4E8]/30 bg-[#00D4E8]/5 text-[#00D4E8] hover:bg-[#00D4E8]/15 hover:text-white transition-all gap-2"
                      >
                        View Plans &amp; Pricing
                      </Button>
                    </Link>
                  </div>
                  <button
                    type="button"
                    onClick={onTryAgainLater}
                    className="text-xs text-slate-400 hover:text-white underline underline-offset-4 decoration-slate-600 hover:decoration-white transition-colors cursor-pointer pt-1"
                  >
                    Try Again Later
                  </button>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-between text-xs text-slate-300">
                <span className="font-mono text-[11px] text-slate-400">16:9 • Video Generation Quota</span>
                <span className="font-mono text-[#00D4E8] text-[11px] font-semibold">Pro Plan Available</span>
              </div>
            </div>
          ) : videoUrl && !videoError ? (
            <div className="aspect-[16/9] relative flex items-center justify-center bg-black">
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                playsInline
                autoPlay
                loop
                onError={() => setVideoError(true)}
                className="w-full h-full object-contain"
              />
              {/* Visual experience overlay */}
              {libraryVideo && (
                <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
                  <Badge className="bg-primary/90 text-primary-foreground text-[10px] font-semibold px-2 shadow-lg">
                    ✨ Visual Lesson
                  </Badge>
                  <Badge variant="outline" className="bg-black/60 border-white/20 text-white/70 text-[10px] font-mono">
                    {Math.round(libraryVideo.duration_seconds / 60)}m · {libraryVideo.educational_level?.replace("_", " ")}
                  </Badge>
                </div>
              )}
            </div>
          ) : (
            /* Generic Fallback or Stream Playback Recovery */
            <div className="aspect-[16/9] relative flex items-center justify-center bg-gradient-to-br from-[#071D20] to-[#040C0E] p-6 text-center">
              <div className="absolute inset-0 neura-grid-dark opacity-15 pointer-events-none" />
              <div className="relative z-10 max-w-md space-y-3 flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(15,164,175,0.3)]">
                  <Film className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white mb-1">
                    {videoError ? "Visual Stream Unavailable" : "Educational Blueprint & Lesson Prepared"}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {videoError
                      ? "The requested video stream could not be loaded or requires an authenticated session. You can retry the stream, browse alternatives, or continue with your notes."
                      : "The lesson plan, study notes, and quiz framework are ready. You can browse visual lessons in the curated library."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {videoError && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setVideoError(false)}
                      className="h-8 text-xs border-primary/40 text-primary hover:bg-primary/20 gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Retry Playback
                    </Button>
                  )}
                  <Link href="/library">
                    <Button size="sm" variant="outline" className="h-8 text-xs border-border text-foreground hover:bg-muted">
                      Browse Available Videos
                    </Button>
                  </Link>
                  <Link href="/create">
                    <Button size="sm" variant="ghost" className="h-8 text-xs text-slate-400 hover:text-white">
                      Explore Another Topic
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-between text-xs text-slate-300">
                <span className="font-mono">16:9 • Cinematic Educational Package</span>
                <span className="font-mono text-primary font-semibold">Package Assembled</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Library video tags */}
      {libraryVideo && libraryVideo.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {libraryVideo.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px] font-normal">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Download button */}
      {videoUrl && (
        <a href={videoUrl} download={`${plan?.title || "neura-video"}.mp4`} className="block">
          <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <Download className="w-4 h-4" /> Download MP4
          </Button>
        </a>
      )}

      {/* Collapsible Master Prompt */}
      {masterPrompt && (
        <div className="rounded-xl border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setShowPrompt(!showPrompt)}
            className="w-full flex items-center justify-between p-4 hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <FileText className="w-4 h-4 text-primary" /> Master Prompt
            </div>
            {showPrompt ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          {showPrompt && (
            <div className="border-t border-border">
              <div className="flex justify-end px-4 pt-2">
                <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 text-xs gap-1 text-muted-foreground">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <div className="px-4 pb-4 text-xs font-mono leading-relaxed text-foreground/90 whitespace-pre-wrap bg-muted/40">
                {masterPrompt}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Topic overview */}
      {plan && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-background/50 border border-border/60">
            <span className="text-xs uppercase tracking-wider text-primary font-semibold">
              Learning Objectives
            </span>
            <ul className="text-xs text-foreground/80 mt-2 space-y-1.5 list-disc list-inside">
              {plan.learningObjectives.map((obj, i) => <li key={i}>{obj}</li>)}
            </ul>
          </div>
          <div className="p-4 rounded-xl bg-background/50 border border-border/60">
            <span className="text-xs uppercase tracking-wider text-primary font-semibold">
              Core Concepts
            </span>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {plan.keyConcepts.map((kc, i) => (
                <Badge key={i} variant="secondary" className="text-xs font-normal">
                  {kc}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Topic summary */}
      {plan?.summary && (
        <div className="p-4 rounded-xl bg-background/50 border border-border/60">
          <p className="text-xs text-muted-foreground leading-relaxed">{plan.summary}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-2">
        <Link href="/create">
          <Button variant="outline" className="bg-card border-border hover:bg-muted gap-2">
            <RefreshCw className="w-4 h-4" /> New Plan
          </Button>
        </Link>
        <Link href="/projects">
          <Button variant="outline" className="bg-card border-border hover:bg-muted gap-2">
            View All Projects
          </Button>
        </Link>
        <Link href="/create" className="ml-auto">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <Plus className="w-4 h-4" /> Create Another
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Result Page
// ---------------------------------------------------------------------------
const DEFAULT_PROMPT =
  "Create a scientifically accurate cinematic 3D medical visualization of the human heart. Show the complete anatomical heart with realistic cardiac tissue and clearly visible chambers and major blood vessels.";

function ResultPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlErrorCode = searchParams ? (searchParams.get("errorCode") || searchParams.get("error")) : null;

  const [topic, setTopic] = useState("How the Human Heart Pumps Blood");
  const [tab, setTab] = useState<Tab>("video");
  const [masterPrompt, setMasterPrompt] = useState(DEFAULT_PROMPT);
  const [plan, setPlan] = useState<EducationalPlan | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [libraryVideo, setLibraryVideo] = useState<LibraryVideo | null>(null);
  const [showNoMatchModal, setShowNoMatchModal] = useState(false);
  const [noMatchAlternatives, setNoMatchAlternatives] = useState<LibraryVideo[]>([]);
  const [storedErrorCode, setStoredErrorCode] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCode = localStorage.getItem("neura_generation_error_code");
      if (savedCode) setTimeout(() => setStoredErrorCode(savedCode), 0);

      const savedTopic = localStorage.getItem("neura_topic");
      if (savedTopic) setTimeout(() => setTopic(savedTopic), 0);

      const savedPrompt = localStorage.getItem("neura_master_prompt");
      if (savedPrompt) setTimeout(() => setMasterPrompt(savedPrompt), 0);

      const savedVideo = localStorage.getItem("neura_video_url");
      if (savedVideo) setTimeout(() => setVideoUrl(savedVideo), 0);

      const savedPlan = localStorage.getItem("neura_plan");
      if (savedPlan) {
        try {
          const parsed = JSON.parse(savedPlan);
          setTimeout(() => setPlan(parsed), 0);
        } catch {
          // ignore parse errors
        }
      }

      // Library video match
      const savedLibVid = localStorage.getItem("neura_library_video");
      if (savedLibVid) {
        try {
          const parsed = JSON.parse(savedLibVid) as LibraryVideo;
          setTimeout(() => setLibraryVideo(parsed), 0);
        } catch {
          // ignore
        }
      }

      // No-match flow
      const noMatch = localStorage.getItem("neura_no_match");
      if (noMatch === "true") {
        const alts = localStorage.getItem("neura_alternatives");
        if (alts) {
          try {
            const parsed = JSON.parse(alts) as LibraryVideo[];
            setTimeout(() => {
              setNoMatchAlternatives(parsed);
              setShowNoMatchModal(true);
            }, 600);
          } catch {
            // ignore
          }
        } else {
          setTimeout(() => setShowNoMatchModal(true), 600);
        }
        localStorage.removeItem("neura_no_match");
        localStorage.removeItem("neura_alternatives");
      }
    }
  }, []);

  const isCreditsExhausted = Boolean(
    urlErrorCode === "CREDITS_EXHAUSTED" ||
    urlErrorCode === "HF_CREDITS_EXHAUSTED" ||
    urlErrorCode === "PIXAZO_INSUFFICIENT_FUNDS" ||
    storedErrorCode === "CREDITS_EXHAUSTED" ||
    storedErrorCode === "HF_CREDITS_EXHAUSTED" ||
    storedErrorCode === "PIXAZO_INSUFFICIENT_FUNDS"
  );

  useEffect(() => {
    if (isCreditsExhausted) {
      const timer = setTimeout(() => {
        setShowUpgradeModal(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isCreditsExhausted]);

  const handleTryAgainLater = () => {
    // Preserve topic, prompt, plan, but dismiss credit error state and return to topic editor
    if (typeof window !== "undefined") {
      localStorage.removeItem("neura_generation_error_code");
      const url = new URL(window.location.href);
      url.searchParams.delete("errorCode");
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
    }
    setStoredErrorCode(null);
    router.push("/create");
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "video", label: "Video", icon: <Film className="h-4 w-4" /> },
    { id: "notes", label: "Notes", icon: <BookOpen className="h-4 w-4" /> },
    { id: "mcqs", label: "MCQs", icon: <ClipboardList className="h-4 w-4" /> },
    { id: "summary", label: "Lesson Summary", icon: <LayoutList className="h-4 w-4" /> },
  ];

  return (
    <div className="bg-background min-h-[calc(100vh-64px)] w-full pb-16">
      {/* Aurora glow */}
      <div className="absolute top-0 left-0 w-full h-[300px] overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full bg-gradient-to-b from-primary/10 to-transparent blur-3xl rounded-full" />
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
            <div className="text-xs text-primary font-semibold tracking-widest uppercase mb-2">
              Generated Educational Package
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1.5 text-foreground">
              {plan?.title || topic}
            </h1>
            <p className="text-xs text-muted-foreground">
              AI-powered educational platform • Educational blueprint & verified video library
            </p>
          </div>
          {videoUrl && (
            <a href={videoUrl} download={`${plan?.title || "neura-video"}.mp4`}>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md gap-2">
                <Download className="w-4 h-4" /> Download MP4
              </Button>
            </a>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border gap-1 overflow-x-auto pb-px mb-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              id={`tab-${t.id}`}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                tab === t.id
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab panels */}
        <Card className="bg-card border-border shadow-sm animate-in fade-in duration-300">
          <CardContent className="p-6">
            {tab === "video" && (
              <VideoTab
                videoUrl={videoUrl}
                plan={plan}
                topic={topic}
                masterPrompt={masterPrompt}
                libraryVideo={libraryVideo}
                isCreditsExhausted={isCreditsExhausted}
                onOpenUpgrade={() => setShowUpgradeModal(true)}
                onTryAgainLater={handleTryAgainLater}
              />
            )}
            {tab === "notes" && (
              <NotesTab plan={plan} topic={topic} masterPrompt={masterPrompt} />
            )}
            {tab === "mcqs" && (
              <McqsTab plan={plan} topic={topic} libraryVideo={libraryVideo} />
            )}
            {tab === "summary" && <SummaryTab plan={plan} />}
          </CardContent>
        </Card>
      </div>

      {/* No-match modal */}
      {showNoMatchModal && (
        <NoMatchModal
          alternatives={noMatchAlternatives}
          onClose={() => setShowNoMatchModal(false)}
        />
      )}

      {/* Pro upgrade modal */}
      <ProUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<div className="bg-background min-h-screen" />}>
      <ResultPageContent />
    </Suspense>
  );
}
