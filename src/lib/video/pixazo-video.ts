import type { VideoJobStatus } from "@/types/ai";
import type {
  VideoGenerationProvider,
  VideoGenerationRequest,
  VideoProviderCapabilities,
} from "./types";
import { getJob, saveJob, updateJobStatus } from "./jobs";
import { formatVideoModelPrompt } from "./huggingface-video";

export const PIXAZO_GATEWAY_URL =
  process.env.PIXAZO_GATEWAY_URL || "https://gateway.pixazo.ai";
export const PIXAZO_LTX_ENDPOINT = `${PIXAZO_GATEWAY_URL}/ltx-2-5-lite/v1/text-to-video`;
export const PIXAZO_STATUS_ENDPOINT = `${PIXAZO_GATEWAY_URL}/v2/requests/status`;
export const DEFAULT_PIXAZO_MODEL = "ltx-2-5-lite";

// Pricing per second for LTX 2.5 Lite according to official Pixazo specifications
export const PIXAZO_RATES_PER_SECOND: Record<string, number> = {
  "720p": 0.09,
  "1080p": 0.13,
  "2k": 0.19,
  "4k": 0.3,
};

/**
 * Calculates estimated cost in USD for a given duration and resolution.
 */
export function calculatePixazoCost(
  durationSeconds: number,
  resolution: string = "720p"
): number {
  const rate = PIXAZO_RATES_PER_SECOND[resolution] || PIXAZO_RATES_PER_SECOND["720p"];
  return Number((durationSeconds * rate).toFixed(2));
}

export class PixazoLtxVideoProvider implements VideoGenerationProvider {
  readonly name = "pixazo";

  /**
   * Checks whether Pixazo API key is configured.
   */
  isConfigured(): boolean {
    const key = process.env.PIXAZO_API_KEY?.trim();
    return Boolean(
      key &&
        !key.includes("your-pixazo-api-key") &&
        key.length > 5
    );
  }

  getCapabilities(): VideoProviderCapabilities {
    return {
      name: "Pixazo LTX 2.5 Lite",
      supportsCancellation: false,
      supportedModels: ["ltx-2-5-lite", "Lightricks/LTX-Video-2.5-Lite"],
      maxDurationSeconds: 20,
    };
  }

  /**
   * Submits a video generation task to Pixazo LTX 2.5 Lite endpoint.
   */
  async submitJob(request: VideoGenerationRequest): Promise<VideoJobStatus> {
    const now = new Date().toISOString();
    const model = process.env.PIXAZO_LTX_MODEL || DEFAULT_PIXAZO_MODEL;

    // Cost-safety: Clamp initial test duration to 5 seconds by default (max 10s)
    const duration = Math.max(2, Math.min(10, Number(request.durationSeconds) || 5));
    const resolution = "720p"; // Standard cost-effective 720p Lite resolution
    const costEstimate = calculatePixazoCost(duration, resolution);

    // Duplicate submission protection: if this job already has a providerJobId, return existing status
    const existingJob = await getJob(request.jobId);
    if (existingJob?.providerJobId) {
      return this.getJobStatus(request.jobId);
    }

    const initialJob: VideoJobStatus = {
      jobId: request.jobId,
      projectId: request.projectId,
      userId: request.userId,
      topic: request.topic,
      model,
      provider: this.name,
      status: "queued",
      progressPercent: 20,
      costEstimate,
      createdAt: now,
      updatedAt: now,
    };

    await saveJob(initialJob);

    const apiKey = process.env.PIXAZO_API_KEY?.trim();
    if (!this.isConfigured() || !apiKey) {
      const failedJob: VideoJobStatus = {
        ...initialJob,
        status: "failed",
        progressPercent: 0,
        errorCode: "PIXAZO_KEY_MISSING",
        error:
          "Pixazo API key is not configured. Please set PIXAZO_API_KEY in your .env.local file to activate LTX 2.5 Lite video generation.",
        updatedAt: new Date().toISOString(),
      };
      await saveJob(failedJob);
      return failedJob;
    }

    // Format prompt optimized for LTX 2.5 3D educational rendering
    const formattedPrompt = formatVideoModelPrompt(
      request.masterPrompt,
      request.topic
    );

    const payload = {
      prompt: formattedPrompt,
      duration,
      resolution,
    };

    try {
      const response = await fetch(PIXAZO_LTX_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Ocp-Apim-Subscription-Key": apiKey,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000), // 30-second timeout
      });

      const responseText = await response.text();
      let responseData: Record<string, unknown> = {};
      try {
        responseData = JSON.parse(responseText);
      } catch {
        // Non-JSON response
      }

      // Handle HTTP error codes with safe, sanitized messages
      if (!response.ok) {
        let errorCode = "PIXAZO_API_ERROR";
        let sanitizedError =
          (responseData.message as string) ||
          (responseData.error as string) ||
          `Pixazo returned HTTP status ${response.status}`;

        if (response.status === 401 || response.status === 403) {
          errorCode = "PIXAZO_AUTH_FAILED";
          sanitizedError =
            "Invalid or unauthorized Pixazo API subscription key. Please verify PIXAZO_API_KEY in .env.local.";
        } else if (response.status === 402) {
          errorCode = "PIXAZO_INSUFFICIENT_FUNDS";
          sanitizedError =
            "Pixazo account has insufficient credits or unpaid balance. Please top up your Pixazo account to continue generating videos.";
        } else if (response.status === 429) {
          errorCode = "PIXAZO_RATE_LIMITED";
          sanitizedError =
            "Pixazo API rate limit reached. Please wait a few moments before retrying.";
        } else if (response.status === 400) {
          errorCode = "PIXAZO_INVALID_REQUEST";
          sanitizedError =
            (responseData.message as string) ||
            "Pixazo rejected the request parameters. Please verify prompt and duration.";
        }

        const failedJob: VideoJobStatus = {
          ...initialJob,
          status: "failed",
          progressPercent: 0,
          errorCode,
          error: sanitizedError,
          updatedAt: new Date().toISOString(),
        };
        await saveJob(failedJob);
        return failedJob;
      }

      // Expected response format on 202/200: { request_id: string, status?: string, polling_url?: string }
      const requestId = (responseData.request_id as string) || (responseData.id as string);
      const pollingUrl =
        (responseData.polling_url as string) ||
        `${PIXAZO_STATUS_ENDPOINT}/${requestId}`;

      if (!requestId) {
        const failedJob: VideoJobStatus = {
          ...initialJob,
          status: "failed",
          progressPercent: 0,
          errorCode: "PIXAZO_INVALID_RESPONSE",
          error: "Pixazo did not return a valid request_id for the generation task.",
          updatedAt: new Date().toISOString(),
        };
        await saveJob(failedJob);
        return failedJob;
      }

      const queuedJob: VideoJobStatus = {
        ...initialJob,
        status: "queued",
        progressPercent: 25,
        providerJobId: requestId,
        pollingUrl,
        updatedAt: new Date().toISOString(),
      };

      await saveJob(queuedJob);
      return queuedJob;
    } catch (err: unknown) {
      const error = err as Error;
      const isTimeout =
        error.name === "TimeoutError" || error.message.includes("timeout");

      const failedJob: VideoJobStatus = {
        ...initialJob,
        status: "failed",
        progressPercent: 0,
        errorCode: isTimeout ? "PIXAZO_TIMEOUT" : "PIXAZO_NETWORK_ERROR",
        error: isTimeout
          ? "Request to Pixazo LTX gateway timed out. Please try again."
          : `Network error connecting to Pixazo: ${error.message}`,
        updatedAt: new Date().toISOString(),
      };

      await saveJob(failedJob);
      return failedJob;
    }
  }

  /**
   * Polls the status of an active Pixazo generation job using its request_id.
   */
  async getJobStatus(jobId: string): Promise<VideoJobStatus> {
    const job = await getJob(jobId);
    if (!job) {
      const now = new Date().toISOString();
      return {
        jobId,
        status: "failed",
        provider: this.name,
        error: "Job not found in local registry.",
        errorCode: "NOT_FOUND",
        createdAt: now,
        updatedAt: now,
      };
    }

    // If job is already finished, return immediately
    if (job.status === "completed" || job.status === "failed") {
      return job;
    }

    // If no providerJobId is recorded, job cannot be polled
    if (!job.providerJobId) {
      return job;
    }

    const apiKey = process.env.PIXAZO_API_KEY?.trim();
    if (!apiKey) {
      return job;
    }

    try {
      const statusUrl = `${PIXAZO_STATUS_ENDPOINT}/${job.providerJobId}`;
      const response = await fetch(statusUrl, {
        method: "GET",
        headers: {
          "Ocp-Apim-Subscription-Key": apiKey,
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Keep existing state or mark not found
          return job;
        }
        if (response.status === 402) {
          return (
            (await updateJobStatus(jobId, {
              status: "failed",
              errorCode: "PIXAZO_INSUFFICIENT_FUNDS",
              error:
                "Pixazo account has insufficient credits or unpaid balance.",
            })) || job
          );
        }
        return job;
      }

      const data = await response.json();
      const rawStatus = (data.status as string)?.toUpperCase();

      if (rawStatus === "COMPLETED") {
        // Extract media_url from output object (handles string or array)
        let mediaUrl: string | undefined;
        if (data.output?.media_url) {
          mediaUrl = Array.isArray(data.output.media_url)
            ? data.output.media_url[0]
            : data.output.media_url;
        } else if (data.output?.video_url) {
          mediaUrl = data.output.video_url;
        } else if (data.media_url) {
          mediaUrl = Array.isArray(data.media_url)
            ? data.media_url[0]
            : data.media_url;
        }

        const updated = await updateJobStatus(jobId, {
          status: "completed",
          progressPercent: 100,
          videoUrl: mediaUrl,
        });

        return updated || job;
      }

      if (rawStatus === "FAILED" || rawStatus === "ERROR") {
        const errorDesc =
          (data.error as string) ||
          (data.message as string) ||
          "Generation task failed on Pixazo.";

        const updated = await updateJobStatus(jobId, {
          status: "failed",
          progressPercent: 0,
          errorCode: "PIXAZO_GENERATION_FAILED",
          error: errorDesc,
        });

        return updated || job;
      }

      if (rawStatus === "IN_PROGRESS" || rawStatus === "PROCESSING") {
        const updated = await updateJobStatus(jobId, {
          status: "generating",
          progressPercent: 65,
        });
        return updated || job;
      }

      if (rawStatus === "QUEUED") {
        const updated = await updateJobStatus(jobId, {
          status: "queued",
          progressPercent: 25,
        });
        return updated || job;
      }

      return job;
    } catch {
      // In case of transient network error, preserve existing status without marking as failed
      return job;
    }
  }
}
