import type { VideoJobStatus } from "@/types/ai";
import type { VideoGenerationProvider, VideoGenerationRequest, VideoProviderCapabilities } from "./types";

/**
 * Default provider used when no external video generation API is configured.
 * Safely preserves the educational plan and prompt without fabricating a fake video.
 */
export class UnconfiguredVideoProvider implements VideoGenerationProvider {
  readonly name = "unconfigured";

  isConfigured(): boolean {
    return false;
  }

  getCapabilities(): VideoProviderCapabilities {
    return {
      name: "Unconfigured Video Provider",
      supportsCancellation: false,
      supportedModels: ["HunyuanVideo", "LTX", "CogVideoX"],
      maxDurationSeconds: 15,
    };
  }

  async submitJob(request: VideoGenerationRequest): Promise<VideoJobStatus> {
    const now = new Date().toISOString();
    return {
      jobId: request.jobId,
      projectId: request.projectId,
      status: "awaiting_video_provider",
      provider: this.name,
      progressPercent: 0,
      error: "External video rendering service is not yet configured. Your AI educational plan and master prompt are saved and ready for generation once an endpoint is connected.",
      createdAt: now,
      updatedAt: now,
    };
  }

  async getJobStatus(jobId: string): Promise<VideoJobStatus> {
    const now = new Date().toISOString();
    return {
      jobId,
      status: "awaiting_video_provider",
      provider: this.name,
      progressPercent: 0,
      error: "No active video rendering worker configured.",
      createdAt: now,
      updatedAt: now,
    };
  }
}

import { HuggingFaceVideoProvider } from "./huggingface-video";
import { PixazoLtxVideoProvider } from "./pixazo-video";

// In-memory registry for video generation providers
const providerRegistry = new Map<string, VideoGenerationProvider>();
const defaultProvider = new UnconfiguredVideoProvider();
const hfVideoProvider = new HuggingFaceVideoProvider();
const pixazoVideoProvider = new PixazoLtxVideoProvider();

providerRegistry.set("unconfigured", defaultProvider);
providerRegistry.set("huggingface", hfVideoProvider);
providerRegistry.set("pixazo", pixazoVideoProvider);

/**
 * Registers a video provider adapter.
 */
export function registerVideoProvider(provider: VideoGenerationProvider): void {
  providerRegistry.set(provider.name.toLowerCase(), provider);
}

/**
 * Retrieves the active video generation provider.
 * Priority:
 * 1. Explicit name parameter (e.g. "pixazo" or "huggingface")
 * 2. VIDEO_PROVIDER environment variable
 * 3. PixazoLtxVideoProvider (if PIXAZO_API_KEY is configured)
 * 4. HuggingFaceVideoProvider (if HF_TOKEN is configured)
 * 5. Default UnconfiguredVideoProvider
 */
export function getVideoProvider(name?: string): VideoGenerationProvider {
  if (name && providerRegistry.has(name.toLowerCase())) {
    return providerRegistry.get(name.toLowerCase())!;
  }
  const envProvider = process.env.VIDEO_PROVIDER?.toLowerCase();
  if (envProvider && providerRegistry.has(envProvider)) {
    return providerRegistry.get(envProvider)!;
  }
  if (pixazoVideoProvider.isConfigured()) {
    return pixazoVideoProvider;
  }
  if (hfVideoProvider.isConfigured()) {
    return hfVideoProvider;
  }
  return defaultProvider;
}
export { PixazoLtxVideoProvider, HuggingFaceVideoProvider };
