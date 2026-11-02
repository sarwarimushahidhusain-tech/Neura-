/**
 * NEURA PHASE 7 — Planned changes to src/lib/ai/mcqs.ts
 * docs/weak-point/mcqs.planned-additions.ts
 *
 * Move this file to src/ and apply these changes ONLY after Checkpoint 2 approval.
 *
 * Changes (all additive — nothing existing is removed):
 *
 * 1. scoreQuizSubmission() returns ScoredQuizResult (extends QuizResult with
 *    the full McqQuestion[] so the PUT handler can build p_questions without
 *    a second answerKeyStore lookup).
 *
 * 2. buildQuestionResultsPayload() — pure helper to produce the JSONB array
 *    expected by record_quiz_attempt()'s p_questions parameter.
 *
 * The QuizResult shape returned to clients in the API response is UNCHANGED.
 */

import type { McqQuestion } from "@/types/phase4";

// ---------------------------------------------------------------------------
// Extended return type for scoreQuizSubmission
// ---------------------------------------------------------------------------

export interface ScoredQuizResult {
  score: number;
  total: number;
  percentage: number;
  correct: boolean[];
  explanations: string[];
  correctIndexes: number[];
  /** Full McqQuestion objects from the server answer key store (never sent to client). */
  questions: McqQuestion[];
}

// ---------------------------------------------------------------------------
// Per-question payload for record_quiz_attempt() p_questions parameter
// ---------------------------------------------------------------------------

export interface QuestionResultPayload {
  index: number;
  is_correct: boolean;
  concept_ref: string | null;
  difficulty: string | null;
}

/**
 * Pure function — no I/O, no dependencies, fully unit-testable.
 * Constructs the [{index, is_correct, concept_ref, difficulty}] array consumed
 * by record_quiz_attempt() as its p_questions JSONB parameter.
 *
 * Difficulty coercion (matching the function): any value outside
 * ['easy','medium','hard'] is passed as-is to the function, which coerces
 * it to NULL in SQL. The TypeScript layer does not need to coerce it twice.
 */
export function buildQuestionResultsPayload(
  questions: McqQuestion[],
  correct: boolean[]
): QuestionResultPayload[] {
  return questions.map((q, i) => ({
    index: i,
    is_correct: correct[i] ?? false,
    concept_ref: q.conceptRef?.trim() || null,
    difficulty: q.difficulty ?? null,
  }));
}

/*
 * ── PLANNED DIFF: scoreQuizSubmission in src/lib/ai/mcqs.ts ──────────────────
 *
 * Current (lines 281–325):
 *
 *   export function scoreQuizSubmission(
 *     setId: string,
 *     answers: QuizAnswer[]
 *   ): QuizResult {
 *     ...
 *     return { score, total, percentage, correct, explanations, correctIndexes };
 *   }
 *
 * Planned replacement:
 *
 *   export function scoreQuizSubmission(
 *     setId: string,
 *     answers: QuizAnswer[]
 *   ): ScoredQuizResult {
 *     ...
 *     return {
 *       score, total, percentage, correct, explanations, correctIndexes,
 *       questions,   // ← NEW: full question array from answerKeyStore (server only)
 *     };
 *   }
 *
 * The QuizResult slice sent to clients remains identical — the PUT handler
 * destructures only the client-safe fields when building the response.
 */
