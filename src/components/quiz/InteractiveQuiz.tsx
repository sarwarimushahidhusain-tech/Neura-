"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Trophy,
  RotateCcw,
  Loader2,
  AlertCircle,
} from "lucide-react";
import type {
  McqSetSafe,
  McqQuestionSafe,
  QuizAnswer,
  QuizResult,
} from "@/types/phase4";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface QuizProps {
  mcqSet: McqSetSafe;
  onRetake: () => void;
}

type QuizPhase = "answering" | "submitting" | "results";

// ---------------------------------------------------------------------------
// Difficulty badge
// ---------------------------------------------------------------------------
function DiffBadge({ diff }: { diff: string }) {
  const colorMap: Record<string, string> = {
    easy: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    medium: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    hard: "border-rose-500/40 bg-rose-500/10 text-rose-300",
  };
  return (
    <Badge
      variant="outline"
      className={`text-[10px] font-mono capitalize ${colorMap[diff] ?? "border-border"}`}
    >
      {diff}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Single question card
// ---------------------------------------------------------------------------
function QuestionCard({
  question,
  index,
  total,
  selected,
  onSelect,
  result,
}: {
  question: McqQuestionSafe;
  index: number;
  total: number;
  selected: number | undefined;
  onSelect: (optIndex: number) => void;
  result: QuizResult | null;
}) {
  const hasResult = result !== null;
  const isCorrect = hasResult && result.correct[index];
  const correctIdx = hasResult ? result.correctIndexes[index] : -1;

  return (
    <div className="space-y-4">
      {/* Question header */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-foreground leading-relaxed flex-1">
          <span className="text-primary font-bold mr-1.5">{index + 1}.</span>
          {question.question}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <DiffBadge diff={question.difficulty} />
          {hasResult &&
            (isCorrect ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-400" />
            ))}
        </div>
      </div>

      {/* Options */}
      <div className="grid sm:grid-cols-2 gap-2.5" role="radiogroup" aria-label={`Question ${index + 1} options`}>
        {question.options.map((opt, optIdx) => {
          const isChosen = selected === optIdx;
          const isCorrectOpt = hasResult && correctIdx === optIdx;
          const isWrongChosen = hasResult && isChosen && !isCorrectOpt;

          let optClass =
            "p-3 rounded-xl text-xs text-left transition-all duration-200 border w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
          if (isCorrectOpt) {
            optClass += " border-emerald-500/60 bg-emerald-500/10 text-emerald-200";
          } else if (isWrongChosen) {
            optClass += " border-rose-500/60 bg-rose-500/10 text-rose-200";
          } else if (!hasResult && isChosen) {
            optClass +=
              " border-primary bg-primary/10 text-foreground shadow-[0_0_8px_rgba(15,164,175,0.2)]";
          } else if (!hasResult) {
            optClass +=
              " border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5";
          } else {
            optClass += " border-border bg-card/50 text-muted-foreground opacity-60";
          }

          return (
            <button
              key={optIdx}
              type="button"
              role="radio"
              aria-checked={isChosen}
              aria-label={`Option ${String.fromCharCode(65 + optIdx)}: ${opt}`}
              disabled={hasResult}
              onClick={() => onSelect(optIdx)}
              className={optClass}
            >
              <span className="font-bold mr-1.5 text-primary/80">
                {String.fromCharCode(65 + optIdx)}.
              </span>
              {opt}
            </button>
          );
        })}
      </div>

      {/* Explanation after results */}
      {hasResult && (
        <div className="p-3 rounded-xl bg-background/60 border border-border/60 text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">Explanation: </span>
          {result.explanations[index]}
        </div>
      )}
      {question.conceptRef && (
        <p className="text-[11px] text-muted-foreground/60 italic">
          Concept: {question.conceptRef}
        </p>
      )}

      <p className="text-[11px] text-muted-foreground text-center">
        Question {index + 1} of {total}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Score display
// ---------------------------------------------------------------------------
function ScoreDisplay({
  result,
  total,
  onRetake,
}: {
  result: QuizResult;
  total: number;
  onRetake: () => void;
}) {
  const pct = result.percentage;
  const color =
    pct >= 80 ? "text-emerald-400" : pct >= 50 ? "text-amber-400" : "text-rose-400";
  const ringColor =
    pct >= 80 ? "border-emerald-500/40" : pct >= 50 ? "border-amber-500/40" : "border-rose-500/40";

  return (
    <div className="text-center space-y-6 py-4">
      <div
        className={`w-28 h-28 rounded-full border-4 ${ringColor} flex flex-col items-center justify-center mx-auto shadow-lg`}
      >
        <span className={`text-3xl font-bold ${color}`}>{pct}%</span>
        <span className="text-xs text-muted-foreground font-mono">
          {result.score}/{total}
        </span>
      </div>

      <div>
        <div className="flex items-center justify-center gap-2 mb-1">
          <Trophy className={`w-5 h-5 ${color}`} />
          <h3 className="text-lg font-bold text-foreground">
            {pct >= 80 ? "Excellent!" : pct >= 50 ? "Good effort!" : "Keep studying!"}
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          You got <span className="font-semibold text-foreground">{result.score}</span> out of{" "}
          <span className="font-semibold text-foreground">{total}</span> correct.
        </p>
      </div>

      <Button
        onClick={onRetake}
        variant="outline"
        className="border-primary/40 text-primary hover:bg-primary/10 gap-2"
      >
        <RotateCcw className="w-4 h-4" />
        Retake Quiz
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Quiz component
// ---------------------------------------------------------------------------
export default function InteractiveQuiz({ mcqSet, onRetake }: QuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [phase, setPhase] = useState<QuizPhase>("answering");
  const [result, setResult] = useState<QuizResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [viewIndex, setViewIndex] = useState(0);
  const [showReview, setShowReview] = useState(false);

  const questions = mcqSet.questions;
  const total = questions.length;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === total;

  const currentQ: McqQuestionSafe | undefined = questions[currentIndex];

  const handleSelect = useCallback(
    (optIdx: number) => {
      if (phase !== "answering") return;
      setAnswers((prev) => ({ ...prev, [currentIndex]: optIdx }));
    },
    [currentIndex, phase]
  );

  const handleSubmit = async () => {
    if (!allAnswered || phase !== "answering") return;
    setPhase("submitting");
    setSubmitError(null);

    try {
      const quizAnswers: QuizAnswer[] = questions.map((q, i) => ({
        questionId: q.id,
        chosenIndex: answers[i] ?? 0,
      }));

      const res = await fetch("/api/ai/mcqs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setId: mcqSet.id, answers: quizAnswers }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit quiz.");
      }

      setResult(data.result as QuizResult);
      setViewIndex(0);
      setPhase("results");
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setPhase("answering");
    }
  };

  const handleRetake = () => {
    setAnswers({});
    setResult(null);
    setPhase("answering");
    setCurrentIndex(0);
    setViewIndex(0);
    setShowReview(false);
    setSubmitError(null);
    onRetake();
  };

  // In results mode, we show the score summary then allow review
  if (phase === "results" && result) {
    if (!showReview) {
      return (
        <div className="space-y-6">
          <ScoreDisplay result={result} total={total} onRetake={handleRetake} />
          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-primary text-xs gap-1 hover:bg-primary/10"
              onClick={() => setShowReview(true)}
            >
              Review all questions & explanations
            </Button>
          </div>
        </div>
      );
    }

    // Full review
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h4 className="text-sm font-semibold text-foreground">
            Review — {result.score}/{total} correct ({result.percentage}%)
          </h4>
          <Button
            variant="outline"
            size="sm"
            className="border-primary/40 text-primary hover:bg-primary/10 gap-1 h-8 text-xs"
            onClick={handleRetake}
          >
            <RotateCcw className="w-3.5 h-3.5" /> Retake
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            disabled={viewIndex === 0}
            onClick={() => setViewIndex((i) => i - 1)}
            className="gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label="Previous question"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </Button>
          <span className="text-xs text-muted-foreground font-mono">
            {viewIndex + 1} / {total}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={viewIndex === total - 1}
            onClick={() => setViewIndex((i) => i + 1)}
            className="gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label="Next question"
          >
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <QuestionCard
          question={questions[viewIndex]}
          index={viewIndex}
          total={total}
          selected={answers[viewIndex]}
          onSelect={() => {}}
          result={result}
        />
      </div>
    );
  }

  if (!currentQ) return null;

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
          <span>{answeredCount} / {total} answered</span>
          <span>{Math.round((answeredCount / total) * 100)}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
            style={{ width: `${(answeredCount / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Navigation dots */}
      <div className="flex gap-1.5 flex-wrap">
        {questions.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to question ${i + 1}`}
            onClick={() => setCurrentIndex(i)}
            className={`w-6 h-6 rounded-full text-[10px] font-bold transition-all duration-200 border ${
              i === currentIndex
                ? "bg-primary text-primary-foreground border-primary"
                : answers[i] !== undefined
                ? "bg-primary/20 text-primary border-primary/30"
                : "bg-card text-muted-foreground border-border hover:border-primary/30"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Question */}
      <QuestionCard
        question={currentQ}
        index={currentIndex}
        total={total}
        selected={answers[currentIndex]}
        onSelect={handleSelect}
        result={null}
      />

      {/* Navigation + submit */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((i) => i - 1)}
          className="gap-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
          aria-label="Previous question"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </Button>

        {currentIndex < total - 1 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentIndex((i) => i + 1)}
            className="gap-1 text-muted-foreground hover:text-foreground"
            aria-label="Next question"
          >
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            disabled={!allAnswered || phase === "submitting"}
            onClick={handleSubmit}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-9 text-sm font-semibold"
          >
            {phase === "submitting" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
              </>
            ) : (
              <>Submit Quiz</>
            )}
          </Button>
        )}
      </div>

      {!allAnswered && currentIndex === total - 1 && (
        <p className="text-xs text-muted-foreground text-center">
          Answer all {total} questions to submit.
        </p>
      )}

      {submitError && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {submitError}
        </div>
      )}
    </div>
  );
}
