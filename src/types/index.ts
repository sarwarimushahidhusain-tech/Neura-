export interface VideoSettings {
  videoType: string;
  visualStyle: string;
  aspectRatio: string;
  duration: number;
  targetAudience: string;
  language: string;
}

export interface Scene {
  id: string;
  description: string;
}

export interface PromptPlan {
  topic: string;
  goal: string;
  audience: string;
  visualStyle: string;
  duration: number;
  aspectRatio: string;
  scenes: Scene[];
  masterPrompt: string;
}

export interface ModelGeneration {
  model: "LTX" | "HunyuanVideo" | "CogVideoX";
  status: "queued" | "generating" | "completed" | "failed";
  progress: number;
  score?: number;
  videoUrl?: string;
}

export interface Project {
  id: string;
  title: string;
  date: string;
  category: string;
  style: string;
  model: string;
  score: number;
  thumbnail?: string;
}
