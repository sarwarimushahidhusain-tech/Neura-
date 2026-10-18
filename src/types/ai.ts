/**
 * NEURA AI EDUCATIONAL PLANNING & PROMPT ENGINE TYPES (PHASE 2)
 */

export type EducationLevel = "kids" | "middle_school" | "highschool" | "college" | "expert";
export type AspectRatio = "16:9" | "9:16" | "1:1";
export type VisualStyle = "cinematic" | "educational" | "stylized" | "realistic";
export type NarrationPreference = "voiceover" | "subtitles_only" | "visual_cues";

export interface EducationalPlanInput {
  topic: string;
  educationLevel: EducationLevel;
  targetAudience?: string;
  preferredLanguage?: string;
  durationSeconds: number; // e.g. 5, 10, 15, 30, 60
  aspectRatio: AspectRatio;
  visualStyle: VisualStyle;
  narrationPreference?: NarrationPreference;
  additionalInstructions?: string;
}

export interface ScenePlan {
  sceneNumber: number;
  title: string;
  durationSeconds: number;
  description: string;
  visualObjects: string[];
  environment: string;
  animationActions: string;
  cameraAngleAndMovement: string;
  lightingAndRenderStyle: string;
  transition: string;
  narration: string;
  continuityNotes: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface EducationalPlan {
  title: string;
  summary: string;
  learningObjectives: string[];
  keyConcepts: string[];
  scenes: ScenePlan[];
  continuityInstructions: string;
  quizQuestions: QuizQuestion[];
}

export interface MasterPromptResult {
  plan: EducationalPlan;
  masterPrompt: string;
  userPromptEdited?: boolean;
  modelUsed: string;
  estimatedDuration: number;
  generatedAt: string;
}

export type JobLifecycleStage =
  | "queued"
  | "planning"
  | "awaiting_video_provider"
  | "generating"
  | "processing"
  | "completed"
  | "failed";

export interface VideoJobStatus {
  jobId: string;
  projectId?: string;
  userId?: string;
  topic?: string;
  status: JobLifecycleStage;
  provider: string; // e.g. "unconfigured", "huggingface", "pixazo", "fal-ai"
  model?: string;
  progressPercent?: number;
  videoUrl?: string;
  providerJobId?: string;
  pollingUrl?: string;
  costEstimate?: number;
  error?: string;
  errorCode?: string;
  createdAt: string;
  updatedAt: string;
}
