/**
 * NEURA PHASE 4 — OPENROUTER AI, STUDY NOTES & MCQ TYPES
 */

// ---------------------------------------------------------------------------
// OpenRouter
// ---------------------------------------------------------------------------

export interface OpenRouterConfig {
  apiKey: string;
  model: string;
  isConfigured: boolean;
}

// ---------------------------------------------------------------------------
// Educational Notes
// ---------------------------------------------------------------------------

export type NoteDetailLevel = "quick" | "detailed";

export interface NotesGenerationInput {
  topic: string;
  plan: import("@/types/ai").EducationalPlan;
  masterPrompt?: string;
  /** Verified transcript or scene text, if actually available */
  transcript?: string;
  detailLevel: NoteDetailLevel;
  preferredLanguage?: string;
}

export interface DefinitionEntry {
  term: string;
  definition: string;
}

export interface ConceptSection {
  concept: string;
  explanation: string;
  examples: string[];
}

export interface StudyNotes {
  title: string;
  detailLevel: NoteDetailLevel;
  learningObjectives: string[];
  definitions: DefinitionEntry[];
  mainConcepts: ConceptSection[];
  stepByStepExplanations: string[];
  keyTakeaways: string[];
  revisionSummary: string;
  generatedAt: string;
  modelUsed: string;
  /** Disclaimer about what source material was used */
  sourceDisclaimer: string;
}

// ---------------------------------------------------------------------------
// MCQs
// ---------------------------------------------------------------------------

export type McqDifficulty = "easy" | "medium" | "hard" | "mixed";

export interface McqGenerationInput {
  topic: string;
  plan: import("@/types/ai").EducationalPlan;
  notes?: StudyNotes;
  /** Verified transcript or scene text, if actually available */
  transcript?: string;
  numQuestions: number;
  difficulty: McqDifficulty;
}

export interface McqQuestion {
  id: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
  difficulty: Exclude<McqDifficulty, "mixed">;
  conceptRef?: string;
}

export interface McqSet {
  id: string;
  topic: string;
  questions: McqQuestion[];
  totalQuestions: number;
  difficulty: McqDifficulty;
  generatedAt: string;
  modelUsed: string;
}

// ---------------------------------------------------------------------------
// Quiz session (client-side; answer key stripped before sending)
// ---------------------------------------------------------------------------

/** Safe version sent to client before submission — no correctIndex */
export interface McqQuestionSafe {
  id: string;
  question: string;
  options: [string, string, string, string];
  difficulty: Exclude<McqDifficulty, "mixed">;
  conceptRef?: string;
}

export interface McqSetSafe {
  id: string;
  topic: string;
  questions: McqQuestionSafe[];
  totalQuestions: number;
  difficulty: McqDifficulty;
  generatedAt: string;
}

export interface QuizAnswer {
  questionId: string;
  chosenIndex: number;
}

export interface QuizResult {
  score: number;
  total: number;
  percentage: number;
  correct: boolean[];
  explanations: string[];
  correctIndexes: number[];
}

// ---------------------------------------------------------------------------
// API Response shapes
// ---------------------------------------------------------------------------

export interface NotesApiResponse {
  success: true;
  notes: StudyNotes;
  isDemoSession: boolean;
}

export interface McqApiResponse {
  success: true;
  mcqSet: McqSetSafe;
  isDemoSession: boolean;
}

export interface McqSubmitApiResponse {
  success: true;
  result: QuizResult;
}
