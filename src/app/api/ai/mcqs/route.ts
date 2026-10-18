import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ValidationError } from "@/lib/ai/validator";
import {
  generateMcqSet,
  scoreQuizSubmission,
  validateMcqInput,
  validateSubmitInput,
} from "@/lib/ai/mcqs";
import { OpenRouterConfigError, OpenRouterError, isOpenRouterConfigured } from "@/lib/ai/openrouter";

/**
 * POST /api/ai/mcqs — generate a new MCQ set
 */
export async function POST(request: Request) {
  try {
    const isDbActive = isSupabaseConfigured();
    let authenticatedUser = null;

    if (isDbActive) {
      authenticatedUser = await getServerUser();
      if (!authenticatedUser) {
        return NextResponse.json(
          { success: false, error: "Authentication required.", code: "UNAUTHORIZED" },
          { status: 401 }
        );
      }
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body.", code: "INVALID_JSON" },
        { status: 400 }
      );
    }

    const input = validateMcqInput(body);

    if (!isOpenRouterConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "OpenRouter is not configured. Please set OPENROUTER_API_KEY in your .env.local file.",
          code: "OR_UNCONFIGURED",
          documentationUrl: "https://openrouter.ai/keys",
        },
        { status: 503 }
      );
    }

    const { mcqSet } = await generateMcqSet(input);

    return NextResponse.json({
      success: true,
      mcqSet,
      isDemoSession: !isDbActive,
      userId: authenticatedUser?.id || "demo-creator",
    });
  } catch (err: unknown) {
    if (err instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: err.message, code: "VALIDATION_ERROR", field: err.field },
        { status: 400 }
      );
    }
    if (err instanceof OpenRouterConfigError) {
      return NextResponse.json(
        { success: false, error: err.message, code: "OR_UNCONFIGURED" },
        { status: 503 }
      );
    }
    if (err instanceof OpenRouterError) {
      return NextResponse.json(
        { success: false, error: err.message, code: err.code },
        { status: err.statusCode }
      );
    }
    const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
    return NextResponse.json({ success: false, error: msg, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/**
 * PUT /api/ai/mcqs — submit quiz answers and receive scored results
 */
export async function PUT(request: Request) {
  try {
    const isDbActive = isSupabaseConfigured();
    if (isDbActive) {
      const user = await getServerUser();
      if (!user) {
        return NextResponse.json(
          { success: false, error: "Authentication required.", code: "UNAUTHORIZED" },
          { status: 401 }
        );
      }
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body.", code: "INVALID_JSON" },
        { status: 400 }
      );
    }

    const { setId, answers } = validateSubmitInput(body);
    const result = scoreQuizSubmission(setId, answers);

    return NextResponse.json({ success: true, result });
  } catch (err: unknown) {
    if (err instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: err.message, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    if (err instanceof OpenRouterError && err.code === "OR_QUIZ_NOT_FOUND") {
      return NextResponse.json(
        { success: false, error: err.message, code: "QUIZ_NOT_FOUND" },
        { status: 404 }
      );
    }
    const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
    return NextResponse.json({ success: false, error: msg, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
