import { NextResponse } from "next/server";
import { getServerUser, createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ValidationError } from "@/lib/ai/validator";
import {
  generateMcqSet,
  scoreQuestions,
  scoreQuizSubmission,
  validateMcqInput,
  validateSubmitInput,
} from "@/lib/ai/mcqs";
import {
  OpenRouterConfigError,
  OpenRouterError,
  isOpenRouterConfigured,
  getOpenRouterModel,
} from "@/lib/ai/openrouter";

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

    const { mcqSet, setId, fullQuestions } = await generateMcqSet(input);

    if (isDbActive && authenticatedUser) {
      try {
        const supabase = await createClient();
        if (supabase) {
          const { error: insertErr } = await supabase
            .from("mcq_sets")
            .insert({
              id: setId,
              user_id: authenticatedUser.id,
              topic: input.topic.trim().slice(0, 200),
              difficulty: input.difficulty,
              total_questions: fullQuestions.length,
              questions_json: fullQuestions,
              model_used: getOpenRouterModel(),
            });

          if (insertErr) {
            console.warn("[POST /api/ai/mcqs] Could not persist mcq_set to database:", insertErr.message);
          }
        }
      } catch (dbErr) {
        console.warn("[POST /api/ai/mcqs] Database error persisting mcq_set:", dbErr);
      }
    }

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
    let user = null;
    if (isDbActive) {
      user = await getServerUser();
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

    const { setId, answers, videoId } = validateSubmitInput(body);

    let result: import("@/types/phase4").QuizResult;
    let validMcqSetId: string | null = null;
    let isRecorded = false;
    let attemptId: string | null = null;
    let recordWarning: string | null = null;

    if (isDbActive && user) {
      const supabase = await createClient();
      if (!supabase) {
        return NextResponse.json(
          { success: false, error: "Database client unavailable.", code: "DB_UNAVAILABLE" },
          { status: 500 }
        );
      }

      // Check if setId is a valid UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(setId);
      let setRow: { id: string; user_id: string; questions_json: unknown; topic: string } | null = null;

      if (isUuid) {
        const { data, error: setErr } = await supabase
          .from("mcq_sets")
          .select("id, user_id, questions_json, topic")
          .eq("id", setId)
          .maybeSingle();

        if (setErr) {
          console.error("[PUT /api/ai/mcqs] Database error retrieving mcq_set:", setErr.message);
          return NextResponse.json(
            { success: false, error: "Database error retrieving quiz.", code: "DB_ERROR" },
            { status: 500 }
          );
        }
        setRow = data;
      }

      if (!setRow) {
        // Fallback to in-memory store if created during unauthenticated/demo mode
        try {
          result = scoreQuizSubmission(setId, answers);
        } catch {
          return NextResponse.json(
            { success: false, error: "Quiz session not found or has expired. Please regenerate the quiz.", code: "QUIZ_NOT_FOUND" },
            { status: 404 }
          );
        }
      } else {
        // Ownership verification
        if (setRow.user_id !== user.id) {
          return NextResponse.json(
            { success: false, error: "Forbidden: You do not have permission to submit answers for this quiz.", code: "FORBIDDEN_QUIZ_OWNERSHIP" },
            { status: 403 }
          );
        }

        // Duplicate submission verification
        const { data: existingAttempt } = await supabase
          .from("quiz_attempts")
          .select("id")
          .eq("user_id", user.id)
          .eq("mcq_set_id", setRow.id)
          .maybeSingle();

        if (existingAttempt) {
          return NextResponse.json(
            { success: false, error: "This quiz has already been submitted and scored.", code: "QUIZ_ALREADY_SUBMITTED" },
            { status: 409 }
          );
        }

        validMcqSetId = setRow.id;
        const storedQuestions = (setRow.questions_json ?? []) as import("@/types/phase4").McqQuestion[];
        if (!Array.isArray(storedQuestions) || storedQuestions.length === 0) {
          return NextResponse.json(
            { success: false, error: "Corrupted quiz question payload.", code: "CORRUPTED_QUIZ_DATA" },
            { status: 500 }
          );
        }

        // Grade against the server-persisted questions (tamper-proof)
        result = scoreQuestions(storedQuestions, answers);
      }

      // Record attempt in quiz_attempts
      try {
        const { data: attemptRow, error: attemptError } = await supabase
          .from("quiz_attempts")
          .insert({
            user_id: user.id,
            mcq_set_id: validMcqSetId,
            score: result.score,
            total: result.total,
            percentage: result.percentage,
            answers_json: answers,
            library_video_id: videoId || null,
          })
          .select("id")
          .single();

        if (attemptError) {
          recordWarning = attemptError.message;
          console.warn("[PUT /api/ai/mcqs] Could not persist quiz attempt:", attemptError.message);
        } else if (attemptRow) {
          isRecorded = true;
          attemptId = attemptRow.id;
        }
      } catch (dbErr) {
        recordWarning = dbErr instanceof Error ? dbErr.message : "Database error";
        console.warn("[PUT /api/ai/mcqs] Failed to record quiz attempt:", recordWarning);
      }
    } else {
      // Demo session without DB
      result = scoreQuizSubmission(setId, answers);
    }

    return NextResponse.json({
      success: true,
      result,
      recorded: isRecorded,
      attemptId,
      ...(recordWarning ? { recordWarning } : {}),
    });
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
