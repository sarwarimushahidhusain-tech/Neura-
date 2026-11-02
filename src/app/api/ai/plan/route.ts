import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { validateEducationalPlanInput, ValidationError } from "@/lib/ai/validator";
import {
  generateEducationalPlanWithOpenRouter,
  OpenRouterConfigError,
  OpenRouterError,
  isOpenRouterConfigured,
} from "@/lib/ai/openrouter";
import {
  generateEducationalPlanWithHuggingFace,
  HuggingFaceConfigError,
  HuggingFaceError,
  isHuggingFaceConfigured,
} from "@/lib/ai/huggingface";
import { buildMasterPrompt } from "@/lib/ai/prompt-builder";

export async function POST(request: Request) {
  try {
    // 1. Session Verification
    const isDbActive = isSupabaseConfigured();
    let authenticatedUser = null;

    if (isDbActive) {
      authenticatedUser = await getServerUser();
      if (!authenticatedUser) {
        return NextResponse.json(
          {
            success: false,
            error: "Authentication required. Please sign in to generate educational visual plans.",
            code: "UNAUTHORIZED",
          },
          { status: 401 }
        );
      }
    }

    // 2. Body Parsing & Validation
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON request body.",
          code: "INVALID_JSON",
        },
        { status: 400 }
      );
    }

    const validatedInput = validateEducationalPlanInput(body);

    // 3. Call AI Planning Service
    // Primary: OpenRouter for lesson planning and prompt generation
    let plan;
    let modelUsed: string;

    if (isOpenRouterConfigured()) {
      const result = await generateEducationalPlanWithOpenRouter(validatedInput);
      plan = result.plan;
      modelUsed = result.modelUsed;
    } else if (isHuggingFaceConfigured()) {
      // Secondary fallback if user configured HF
      const result = await generateEducationalPlanWithHuggingFace(validatedInput);
      plan = result.plan;
      modelUsed = result.modelUsed;
    } else {
      throw new OpenRouterConfigError(
        "OpenRouter API key is not configured. Please add OPENROUTER_API_KEY to your .env.local file to generate prompts."
      );
    }

    // 4. Build Master Prompt
    const masterPrompt = buildMasterPrompt(plan, validatedInput);

    // 5. Return Structured Response
    return NextResponse.json({
      success: true,
      plan,
      masterPrompt,
      modelUsed,
      estimatedDuration: validatedInput.durationSeconds,
      isDemoSession: !isDbActive,
      userId: authenticatedUser?.id || "demo-creator",
      generatedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    if (err instanceof ValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: err.message,
          field: err.field,
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    if (err instanceof OpenRouterConfigError) {
      return NextResponse.json(
        {
          success: false,
          error: "OpenRouter inference service is not configured. Please set OPENROUTER_API_KEY in your .env.local file.",
          code: "OR_UNCONFIGURED",
          documentationUrl: "https://openrouter.ai/keys",
        },
        { status: 503 }
      );
    }

    if (err instanceof OpenRouterError) {
      return NextResponse.json(
        {
          success: false,
          error: err.message,
          code: err.code,
          metadata: err.metadata,
        },
        { status: err.statusCode }
      );
    }

    if (err instanceof HuggingFaceConfigError) {
      return NextResponse.json(
        {
          success: false,
          error: "Neither OpenRouter nor Hugging Face inference services are configured. Please set OPENROUTER_API_KEY or HF_TOKEN in your .env.local file.",
          code: "HF_UNCONFIGURED",
          documentationUrl: "https://openrouter.ai/keys",
        },
        { status: 503 }
      );
    }

    if (err instanceof HuggingFaceError) {
      return NextResponse.json(
        {
          success: false,
          error: err.message,
          code: err.code,
        },
        { status: err.statusCode }
      );
    }

    const genericMessage =
      err instanceof Error ? err.message : "An unexpected planning error occurred.";
    return NextResponse.json(
      {
        success: false,
        error: genericMessage,
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
