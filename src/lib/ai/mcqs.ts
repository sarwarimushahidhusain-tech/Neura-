/**
 * NEURA PHASE 4 — MCQ Generator (Server-side)
 *
 * Generates validated multiple-choice questions.
 * Answer keys are held server-side and only revealed on submission.
 */

import { randomUUID } from "node:crypto";
import type { McqQuestion, McqSetSafe, McqGenerationInput, QuizAnswer, QuizResult, McqDifficulty } from "@/types/phase4";
import {
  callOpenRouterChat,
  extractJson,
  OpenRouterError,
  getOpenRouterModel,
} from "./openrouter";
import { ValidationError } from "./validator";

// In-memory store for answer keys (keyed by mcqSet id).
// In production with Supabase this would be persisted server-side.
const answerKeyStore = new Map<string, McqQuestion[]>();

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

function buildMcqSystemPrompt(difficulty: McqDifficulty, numQuestions: number): string {
  const diffInstr =
    difficulty === "mixed"
      ? "Mix difficulty across easy, medium, and hard questions."
      : `All questions must be ${difficulty} difficulty.`;

  return [
    "You are Neura's MCQ Generation Engine.",
    `Generate exactly ${numQuestions} multiple-choice questions. ${diffInstr}`,
    "You MUST respond ONLY with a single valid JSON object:",
    "{",
    '  "questions": [',
    "    {",
    '      "question": "Question text ending with ?",',
    '      "options": ["Option A", "Option B", "Option C", "Option D"],',
    '      "correctIndex": 0,',
    '      "explanation": "Brief explanation of the correct answer",',
    '      "difficulty": "easy",',
    '      "conceptRef": "Optional: which key concept this tests"',
    "    }",
    "  ]",
    "}",
    "STRICT RULES:",
    "- Output pure JSON only — no markdown fences, no preamble.",
    `- Generate EXACTLY ${numQuestions} questions.`,
    "- Each question must have EXACTLY 4 options.",
    "- correctIndex must be 0, 1, 2, or 3 (integer, not string).",
    "- Exactly ONE option must be correct. The other three must be clearly wrong but plausible distractors.",
    "- No duplicate options within a question.",
    "- All 4 options must be distinct strings.",
    "- difficulty must be one of: easy, medium, hard.",
    "- Ground all questions in the lesson plan content. Do NOT invent claims about video scenes.",
    "- Do not repeat the same question twice.",
  ].join("\n");
}

function buildMcqUserPrompt(input: McqGenerationInput): string {
  const { topic, plan, notes, transcript } = input;

  const lines = [
    `Generate ${input.numQuestions} MCQs for the topic: "${topic}"`,
    ``,
    `=== LESSON PLAN ===`,
    `Title: ${plan.title}`,
    `Summary: ${plan.summary}`,
    `Key Concepts: ${plan.keyConcepts.join(", ")}`,
    `Learning Objectives: ${plan.learningObjectives.join("; ")}`,
  ];

  if (notes) {
    lines.push(
      ``,
      `=== STUDY NOTES SUMMARY ===`,
      `Definitions: ${notes.definitions.map((d) => `${d.term}: ${d.definition}`).join("; ")}`,
      `Key Takeaways: ${notes.keyTakeaways.join("; ")}`
    );
  }

  if (transcript) {
    lines.push(
      ``,
      `=== VERIFIED TRANSCRIPT (use for grounding only) ===`,
      transcript.slice(0, 1500)
    );
  }

  lines.push(
    ``,
    `Base all questions strictly on the content above.`,
    `Difficulty: ${input.difficulty}`,
    `Number of questions: ${input.numQuestions}`
  );

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const ALLOWED_DIFFICULTIES: Array<Exclude<McqDifficulty, "mixed">> = ["easy", "medium", "hard"];

function validateSingleQuestion(
  raw: unknown,
  index: number
): McqQuestion {
  if (!raw || typeof raw !== "object") {
    throw new ValidationError(`Question ${index + 1} is not an object.`);
  }
  const q = raw as Record<string, unknown>;

  const question =
    typeof q.question === "string" && q.question.trim()
      ? q.question.trim()
      : null;
  if (!question) {
    throw new ValidationError(`Question ${index + 1} has no question text.`);
  }

  if (!Array.isArray(q.options) || q.options.length !== 4) {
    throw new ValidationError(
      `Question ${index + 1} must have exactly 4 options (got ${Array.isArray(q.options) ? q.options.length : "non-array"}).`
    );
  }

  const options = q.options as unknown[];
  if (!options.every((o) => typeof o === "string" && (o as string).trim())) {
    throw new ValidationError(`Question ${index + 1} options must all be non-empty strings.`);
  }

  const strOptions = options.map((o) => (o as string).trim()) as [string, string, string, string];

  // Check for duplicate options
  const uniqueOptions = new Set(strOptions.map((o) => o.toLowerCase()));
  if (uniqueOptions.size !== 4) {
    throw new ValidationError(
      `Question ${index + 1} has duplicate options. All 4 must be distinct.`
    );
  }

  const correctIndex = q.correctIndex;
  if (
    typeof correctIndex !== "number" ||
    !Number.isInteger(correctIndex) ||
    correctIndex < 0 ||
    correctIndex > 3
  ) {
    throw new ValidationError(
      `Question ${index + 1} correctIndex must be an integer 0–3 (got ${correctIndex}).`
    );
  }

  const explanation =
    typeof q.explanation === "string" && q.explanation.trim()
      ? q.explanation.trim()
      : "See lesson plan for details.";

  const diffRaw = String(q.difficulty || "medium").toLowerCase();
  const difficulty: Exclude<McqDifficulty, "mixed"> = ALLOWED_DIFFICULTIES.includes(
    diffRaw as Exclude<McqDifficulty, "mixed">
  )
    ? (diffRaw as Exclude<McqDifficulty, "mixed">)
    : "medium";

  const conceptRef =
    typeof q.conceptRef === "string" && q.conceptRef.trim()
      ? q.conceptRef.trim()
      : undefined;

  return {
    id: randomUUID(),
    question,
    options: strOptions,
    correctIndex: correctIndex as 0 | 1 | 2 | 3,
    explanation,
    difficulty,
    conceptRef,
  };
}

function validateMcqResponse(raw: unknown, numRequested: number): McqQuestion[] {
  if (!raw || typeof raw !== "object") {
    throw new ValidationError("MCQ response is not a JSON object.");
  }
  const obj = raw as Record<string, unknown>;

  // Accept { questions: [...] } or a bare array
  const questionsRaw: unknown = Array.isArray(obj) ? obj : (obj.questions ?? []);

  if (!Array.isArray(questionsRaw) || questionsRaw.length === 0) {
    throw new ValidationError("MCQ response contains no questions.");
  }

  const validated = questionsRaw.map((q, i) => validateSingleQuestion(q, i));

  if (validated.length < Math.min(numRequested, 1)) {
    throw new ValidationError(
      `Expected ${numRequested} questions, received ${validated.length}.`
    );
  }

  return validated;
}

// ---------------------------------------------------------------------------
// Strip answer keys for client
// ---------------------------------------------------------------------------

function stripAnswerKey(questions: McqQuestion[]): McqSetSafe["questions"] {
  return questions.map(({ id, question, options, difficulty, conceptRef }) => ({
    id,
    question,
    options,
    difficulty,
    ...(conceptRef ? { conceptRef } : {}),
  }));
}

// ---------------------------------------------------------------------------
// Public: generate MCQ set
// ---------------------------------------------------------------------------

export async function generateMcqSet(
  input: McqGenerationInput,
  retryCount = 0
): Promise<{ mcqSet: McqSetSafe; setId: string }> {
  const messages = [
    { role: "system" as const, content: buildMcqSystemPrompt(input.difficulty, input.numQuestions) },
    { role: "user" as const, content: buildMcqUserPrompt(input) },
  ];

  const rawText = await callOpenRouterChat(messages, {
    maxTokens: Math.max(2500, input.numQuestions * 350),
    temperature: 0.6,
  });

  const model = getOpenRouterModel();

  try {
    const parsed = extractJson(rawText);
    const questions = validateMcqResponse(parsed, input.numQuestions);

    const setId = randomUUID();
    // Store answer key server-side
    answerKeyStore.set(setId, questions);

    const safeSet: McqSetSafe = {
      id: setId,
      topic: input.topic,
      questions: stripAnswerKey(questions),
      totalQuestions: questions.length,
      difficulty: input.difficulty,
      generatedAt: new Date().toISOString(),
    };

    return { mcqSet: safeSet, setId };
  } catch (err: unknown) {
    if (retryCount === 0) {
      return generateMcqSet(input, 1);
    }
    throw new OpenRouterError(
      `Failed to parse MCQ set from model: ${err instanceof Error ? err.message : "Schema error"}`,
      502,
      "OR_MCQ_MALFORMED"
    );
  }

  // Log model used (silent; avoid token exposure)
  void model;
}

// ---------------------------------------------------------------------------
// Public: score quiz submission
// ---------------------------------------------------------------------------

export function scoreQuizSubmission(
  setId: string,
  answers: QuizAnswer[]
): QuizResult {
  const questions = answerKeyStore.get(setId);
  if (!questions) {
    throw new OpenRouterError(
      "Quiz session not found or has expired. Please regenerate the quiz.",
      404,
      "OR_QUIZ_NOT_FOUND"
    );
  }

  const questionMap = new Map(questions.map((q) => [q.id, q]));

  const correct: boolean[] = [];
  const explanations: string[] = [];
  const correctIndexes: number[] = [];

  for (const answer of answers) {
    const q = questionMap.get(answer.questionId);
    if (!q) {
      correct.push(false);
      explanations.push("Question not found.");
      correctIndexes.push(-1);
      continue;
    }
    const isCorrect = answer.chosenIndex === q.correctIndex;
    correct.push(isCorrect);
    explanations.push(q.explanation);
    correctIndexes.push(q.correctIndex);
  }

  const score = correct.filter(Boolean).length;
  const total = correct.length;

  return {
    score,
    total,
    percentage: total > 0 ? Math.round((score / total) * 100) : 0,
    correct,
    explanations,
    correctIndexes,
  };
}

// ---------------------------------------------------------------------------
// Public: validation for API input
// ---------------------------------------------------------------------------

export function validateMcqInput(body: unknown): McqGenerationInput {
  if (!body || typeof body !== "object") {
    throw new ValidationError("Request body must be a JSON object.");
  }
  const raw = body as Record<string, unknown>;

  if (!raw.topic || typeof raw.topic !== "string" || !raw.topic.trim()) {
    throw new ValidationError("topic is required.", "topic");
  }
  if (!raw.plan || typeof raw.plan !== "object") {
    throw new ValidationError("plan is required.", "plan");
  }

  const numQuestions = Number(raw.numQuestions || 5);
  const clampedNum = Math.min(Math.max(Math.round(numQuestions), 1), 20);

  const allowedDiff: McqDifficulty[] = ["easy", "medium", "hard", "mixed"];
  const diffRaw = String(raw.difficulty || "mixed").toLowerCase();
  const difficulty: McqDifficulty = allowedDiff.includes(diffRaw as McqDifficulty)
    ? (diffRaw as McqDifficulty)
    : "mixed";

  return {
    topic: raw.topic.trim(),
    plan: raw.plan as McqGenerationInput["plan"],
    notes: raw.notes as McqGenerationInput["notes"],
    transcript: typeof raw.transcript === "string" ? raw.transcript.slice(0, 3000) : undefined,
    numQuestions: clampedNum,
    difficulty,
  };
}

// ---------------------------------------------------------------------------
// Public: validate submission input
// ---------------------------------------------------------------------------

export function validateSubmitInput(body: unknown): { setId: string; answers: QuizAnswer[] } {
  if (!body || typeof body !== "object") {
    throw new ValidationError("Request body must be a JSON object.");
  }
  const raw = body as Record<string, unknown>;
  if (typeof raw.setId !== "string" || !raw.setId.trim()) {
    throw new ValidationError("setId is required.", "setId");
  }
  if (!Array.isArray(raw.answers)) {
    throw new ValidationError("answers must be an array.", "answers");
  }

  const answers: QuizAnswer[] = raw.answers.map((a, i) => {
    if (!a || typeof a !== "object") {
      throw new ValidationError(`Answer at index ${i} must be an object.`);
    }
    const ans = a as Record<string, unknown>;
    if (typeof ans.questionId !== "string") {
      throw new ValidationError(`Answer at index ${i} must have a questionId string.`);
    }
    const chosenIndex = Number(ans.chosenIndex);
    if (!Number.isInteger(chosenIndex) || chosenIndex < 0 || chosenIndex > 3) {
      throw new ValidationError(
        `Answer at index ${i} chosenIndex must be an integer 0–3.`
      );
    }
    return { questionId: ans.questionId, chosenIndex };
  });

  return { setId: raw.setId.trim(), answers };
}
