"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
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
} from "lucide-react";
import type { EducationalPlan } from "@/types/ai";
import type { StudyNotes, McqSetSafe, NoteDetailLevel, McqDifficulty } from "@/types/phase4";

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

          {/* Disclaimer */}
          <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300/80 italic">
            {notes.sourceDisclaimer}
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
}

function McqsTab({ plan, topic }: McqsTabProps) {
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
// Video Tab
// ---------------------------------------------------------------------------
function VideoTab({
  videoUrl,
  plan,
  masterPrompt,
}: {
  videoUrl: string | null;
  plan: EducationalPlan | null;
  topic?: string;
  masterPrompt: string;
}) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(masterPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Video player */}
      <Card className="bg-[#0B1020] border-slate-800 overflow-hidden shadow-2xl p-1">
        <div className="rounded-xl overflow-hidden relative">
          {videoUrl ? (
            <div className="aspect-[16/9] relative flex items-center justify-center bg-black">
              <video
                src={videoUrl}
                controls
                playsInline
                autoPlay
                loop
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="aspect-[16/9] relative flex items-center justify-center bg-gradient-to-br from-[#071D20] to-[#040C0E] p-6 text-center">
              <div className="absolute inset-0 neura-grid-dark opacity-15 pointer-events-none" />
              <div className="relative z-10 max-w-md space-y-3 flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(15,164,175,0.3)]">
                  <Film className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white mb-1">
                    AI Visual Story & Scenes Synthesized
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    The lesson plan, scene choreography, and Master Prompt are ready. Video generation can be rendered via Pixazo LTX 2.5 Lite.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-xs font-mono">
                    Status: awaiting_video_provider
                  </Badge>
                  <Link href="/generate">
                    <Button size="sm" variant="outline" className="h-7 text-xs border-primary/40 text-primary hover:bg-primary/20">
                      Dispatch in Pipeline
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-between text-xs text-slate-300">
                <span className="font-mono">16:9 • 3D Educational Style</span>
                <span className="font-mono text-primary font-semibold">Master Prompt Ready</span>
              </div>
            </div>
          )}
        </div>
      </Card>

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

export default function ResultPage() {
  const [topic, setTopic] = useState("How the Human Heart Pumps Blood");
  const [tab, setTab] = useState<Tab>("video");
  const [masterPrompt, setMasterPrompt] = useState(DEFAULT_PROMPT);
  const [plan, setPlan] = useState<EducationalPlan | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
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
    }
  }, []);

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
              AI-powered educational platform • OpenRouter + Pixazo LTX 2.5
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
              />
            )}
            {tab === "notes" && (
              <NotesTab plan={plan} topic={topic} masterPrompt={masterPrompt} />
            )}
            {tab === "mcqs" && <McqsTab plan={plan} topic={topic} />}
            {tab === "summary" && <SummaryTab plan={plan} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
