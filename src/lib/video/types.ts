import type { VideoJobStatus } from "@/types/ai";

export interface VideoGenerationRequest {
  jobId: string;
  projectId?: string;
  userId: string;
  topic?: string;
  masterPrompt: string;
  model: string;
  durationSeconds: number;
  aspectRatio: string;
  educationalPlan?: unknown;
}

export interface VideoProviderCapabilities {
  name: string;
  supportsCancellation: boolean;
  supportedModels: string[];
  maxDurationSeconds: number;
}

export interface VideoGenerationProvider {
  readonly name: string;
  isConfigured(): boolean;
  getCapabilities(): VideoProviderCapabilities;
  submitJob(request: VideoGenerationRequest): Promise<VideoJobStatus>;
  getJobStatus(jobId: string): Promise<VideoJobStatus>;
  cancelJob?(jobId: string): Promise<void>;
}
