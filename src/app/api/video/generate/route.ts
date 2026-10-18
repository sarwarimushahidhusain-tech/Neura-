import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getVideoProvider } from "@/lib/video/provider";
import { saveJob } from "@/lib/video/jobs";
import type { VideoGenerationRequest } from "@/lib/video/types";
import type { VideoJobStatus } from "@/types/ai";

export async function POST(request: Request) {
  try {
    // 1. Session & Auth Verification
    const isDbActive = isSupabaseConfigured();
    let userId = "demo-sandbox-user";

    if (isDbActive) {
      const user = await getServerUser();
      if (!user) {
        return NextResponse.json(
          {
            success: false,
            error: "Authentication required to generate videos. Please log in.",
            code: "UNAUTHORIZED",
          },
          { status: 401 }
        );
      }
      userId = user.id;
    }

    // 2. Validate request body
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request payload.",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    const {
      topic,
      masterPrompt,
      model,
      provider: requestedProvider,
      durationSeconds = 5,
      aspectRatio = "16:9",
      projectId,
      educationalPlan,
    } = body;

    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Topic is required.",
          field: "topic",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    if (!masterPrompt || typeof masterPrompt !== "string" || masterPrompt.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Master prompt is required.",
          field: "masterPrompt",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    // Enforce prompt length and parameter bounds
    if (masterPrompt.length > 2500) {
      return NextResponse.json(
        {
          success: false,
          error: "Master prompt exceeds maximum allowed limit of 2,500 characters.",
          field: "masterPrompt",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    const provider = getVideoProvider(requestedProvider);
    const resolvedModel =
      model || (provider.name === "pixazo" ? "ltx-2-5-lite" : "Lightricks/LTX-2.5");

    const clampedDuration = Math.max(2, Math.min(15, Number(durationSeconds) || 5));
    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const jobRequest: VideoGenerationRequest = {
      jobId,
      projectId: projectId || undefined,
      userId,
      topic: topic.trim().slice(0, 200),
      masterPrompt: masterPrompt.trim(),
      model: String(resolvedModel),
      durationSeconds: clampedDuration,
      aspectRatio: String(aspectRatio),
      educationalPlan,
    };

    // 3. Initialize job record
    const initialStatus: VideoJobStatus = {
      jobId,
      projectId: jobRequest.projectId,
      userId,
      topic: jobRequest.topic,
      model: jobRequest.model,
      provider: provider.name,
      status: "queued",
      progressPercent: 15,
      createdAt: now,
      updatedAt: now,
    };
    await saveJob(initialStatus);

    // 4. Submit to provider
    const jobResult = await provider.submitJob(jobRequest);

    const isCreditError =
      jobResult.errorCode === "HF_CREDITS_EXHAUSTED" ||
      jobResult.errorCode === "PIXAZO_INSUFFICIENT_FUNDS";
    const isAuthError =
      jobResult.errorCode === "PIXAZO_AUTH_FAILED" ||
      jobResult.errorCode === "PIXAZO_KEY_MISSING" ||
      jobResult.errorCode === "HF_AUTH_FAILED";

    const isJobAccepted =
      jobResult.status === "completed" ||
      jobResult.status === "queued" ||
      jobResult.status === "generating" ||
      jobResult.status === "processing";

    const statusCode = isCreditError
      ? 402
      : isAuthError
      ? 401
      : !isJobAccepted
      ? 400
      : 200;

    return NextResponse.json(
      {
        success: isJobAccepted,
        job: jobResult,
        costEstimate: jobResult.costEstimate,
        creditWarning: isCreditError
          ? `${provider.name === "pixazo" ? "Pixazo" : "Hugging Face"} account has insufficient credits for video generation.`
          : undefined,
      },
      { status: statusCode }
    );
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      {
        success: false,
        error: error.message || "An unexpected error occurred during video job creation.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
