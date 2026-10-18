import { HfInference } from "@huggingface/inference";
import type { VideoJobStatus } from "@/types/ai";
import type {
  VideoGenerationProvider,
  VideoGenerationRequest,
  VideoProviderCapabilities,
} from "./types";
import { saveJob, updateJobStatus } from "./jobs";

export const DEFAULT_VIDEO_MODEL = "Lightricks/LTX-2.5";
export const DEFAULT_VIDEO_PROVIDER = "fal-ai";

/**
 * Normalizes prompt for text-to-video models.
 * Preserves essential 3D educational instructions while keeping within model context limits.
 */
export function formatVideoModelPrompt(rawPrompt: string, topic?: string): string {
  const clean = rawPrompt.trim();
  if (clean.length <= 1200) {
    return clean;
  }

  // If master prompt is very long, extract top visual & style paragraphs
  const lines = clean.split("\n\n");
  const filtered = lines.slice(0, 3).join(". ");
  const truncated = filtered.length > 1000 ? filtered.slice(0, 1000) + "..." : filtered;

  return `${topic ? `[Topic: ${topic}] ` : ""}${truncated} 3D educational scientific animation, smooth cinematic camera, high visual clarity, realistic lighting.`;
}

export class HuggingFaceVideoProvider implements VideoGenerationProvider {
  readonly name = "huggingface";

  /**
   * Checks whether Hugging Face token is present.
   */
  isConfigured(): boolean {
    const token = (process.env.HF_TOKEN || process.env.HUGGING_FACE_HUB_TOKEN)?.trim();
    return Boolean(token && !token.includes("your-huggingface-token") && token.length > 10);
  }

  getCapabilities(): VideoProviderCapabilities {
    return {
      name: "Hugging Face Inference Video",
      supportsCancellation: false,
      supportedModels: [
        "Lightricks/LTX-2.5",
        "Lightricks/ltx-video-distilled",
        "Lightricks/LTX-2.5-Diffusers",
        "Lightricks/LTX-Video",
        "Wan-AI/Wan2.1-T2V-1.3B",
        "tencent/HunyuanVideo",
        "THUDM/CogVideoX-5b",
      ],
      maxDurationSeconds: 15,
    };
  }

  /**
   * Submits a video generation job to Hugging Face Inference Providers.
   */
  async submitJob(request: VideoGenerationRequest): Promise<VideoJobStatus> {
    const now = new Date().toISOString();
    const model = process.env.HF_VIDEO_MODEL || request.model || DEFAULT_VIDEO_MODEL;
    const provider = (process.env.HF_VIDEO_PROVIDER as "fal-ai" | "replicate" | "hf-inference") || DEFAULT_VIDEO_PROVIDER;

    const initialJob: VideoJobStatus = {
      jobId: request.jobId,
      projectId: request.projectId,
      userId: request.userId,
      topic: request.topic,
      model,
      provider: this.name,
      status: "processing",
      progressPercent: 20,
      createdAt: now,
      updatedAt: now,
    };

    await saveJob(initialJob);

    const token = (process.env.HF_TOKEN || process.env.HUGGING_FACE_HUB_TOKEN)?.trim();
    if (!token || token.includes("your-huggingface-token") || token.length < 10) {
      const failedJob: VideoJobStatus = {
        ...initialJob,
        status: "failed",
        progressPercent: 0,
        errorCode: "HF_TOKEN_MISSING",
        error: "Hugging Face API token is not configured. Please set HF_TOKEN in .env.local to activate video generation.",
        updatedAt: new Date().toISOString(),
      };
      await saveJob(failedJob);
      return failedJob;
    }

    const formattedPrompt = formatVideoModelPrompt(request.masterPrompt, request.topic);

    try {
      const hf = new HfInference(token);

      // Call text-to-video inference
      const videoBlob = await hf.textToVideo({
        model,
        inputs: formattedPrompt,
        provider,
      });

      // Convert Blob response to base64 Data URL for immediate native HTML5 playback
      let videoUrl: string | undefined;
      if (videoBlob && typeof videoBlob.arrayBuffer === "function") {
        const buffer = await videoBlob.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        videoUrl = `data:video/mp4;base64,${base64}`;
      }

      const completedJob: VideoJobStatus = {
        ...initialJob,
        status: "completed",
        progressPercent: 100,
        videoUrl,
        updatedAt: new Date().toISOString(),
      };

      await saveJob(completedJob);
      return completedJob;
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number };
      const rawMessage = error.message || "An unknown error occurred during video rendering.";

      let sanitizedMessage = rawMessage;
      let errorCode = "HF_GENERATION_FAILED";

      // Detect Credit exhaustion (HTTP 402)
      if (
        error.statusCode === 402 ||
        rawMessage.includes("no remaining credits") ||
        rawMessage.includes("402")
      ) {
        errorCode = "HF_CREDITS_EXHAUSTED";
        sanitizedMessage =
          "Hugging Face account has no remaining inference credits for video generation. Purchase pre-paid credits or subscribe to PRO on Hugging Face to activate rendering.";
      } else if (error.statusCode === 429 || rawMessage.includes("rate limit")) {
        errorCode = "HF_RATE_LIMITED";
        sanitizedMessage = "Hugging Face rate limit reached. Please wait before retrying.";
      } else if (error.statusCode === 401 || rawMessage.includes("Invalid token")) {
        errorCode = "HF_AUTH_FAILED";
        sanitizedMessage = "Hugging Face token is invalid or unauthorized.";
      } else if (
        rawMessage.includes("not supported by any provider") ||
        rawMessage.includes("not been able to find inference provider") ||
        rawMessage.includes("No Inference Provider")
      ) {
        errorCode = "HF_MODEL_NOT_SUPPORTED";
        if (model.includes("LTX")) {
          sanitizedMessage = `Hugging Face model '${model}' is an open-weights 3D video diffusion model hosted on Hugging Face Hub. To render video directly via serverless API, switch to the 'Pixazo LTX 2.5 Lite' engine, or attach a dedicated Hugging Face GPU endpoint.`;
        } else {
          sanitizedMessage = `The model '${model}' is not currently supported by provider '${provider}'.`;
        }
      }

      const failedJob: VideoJobStatus = {
        ...initialJob,
        status: "failed",
        progressPercent: 0,
        errorCode,
        error: sanitizedMessage,
        updatedAt: new Date().toISOString(),
      };

      await saveJob(failedJob);
      return failedJob;
    }
  }

  async getJobStatus(jobId: string): Promise<VideoJobStatus> {
    const existing = await updateJobStatus(jobId, {});
    if (existing) return existing;

    const now = new Date().toISOString();
    return {
      jobId,
      status: "failed",
      provider: this.name,
      error: "Job not found.",
      errorCode: "NOT_FOUND",
      createdAt: now,
      updatedAt: now,
    };
  }
}
