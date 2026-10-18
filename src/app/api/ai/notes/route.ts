import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ValidationError } from "@/lib/ai/validator";
import { generateStudyNotes, isOpenRouterConfigured } from "@/lib/ai/notes";
import { OpenRouterConfigError, OpenRouterError } from "@/lib/ai/openrouter";
import type { NotesGenerationInput, NoteDetailLevel } from "@/types/phase4";
import type { EducationalPlan } from "@/types/ai";

export async function POST(request: Request) {
  try {
    // 1. Session check
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

    // 2. Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body.", code: "INVALID_JSON" },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Request body must be an object.", code: "INVALID_BODY" },
        { status: 400 }
      );
    }

    const raw = body as Record<string, unknown>;

    // Validate topic
    if (!raw.topic || typeof raw.topic !== "string" || !raw.topic.trim()) {
      return NextResponse.json(
        { success: false, error: "topic is required.", code: "VALIDATION_ERROR", field: "topic" },
        { status: 400 }
      );
    }

    // Validate plan
    if (!raw.plan || typeof raw.plan !== "object") {
      return NextResponse.json(
        { success: false, error: "plan is required.", code: "VALIDATION_ERROR", field: "plan" },
        { status: 400 }
      );
    }

    const allowedDetailLevels: NoteDetailLevel[] = ["quick", "detailed"];
    const detailLevelRaw = String(raw.detailLevel || "detailed").toLowerCase();
    const detailLevel: NoteDetailLevel = allowedDetailLevels.includes(
      detailLevelRaw as NoteDetailLevel
    )
      ? (detailLevelRaw as NoteDetailLevel)
      : "detailed";

    const input: NotesGenerationInput = {
      topic: (raw.topic as string).trim(),
      plan: raw.plan as EducationalPlan,
      masterPrompt: typeof raw.masterPrompt === "string" ? raw.masterPrompt : undefined,
      transcript: typeof raw.transcript === "string" ? raw.transcript.slice(0, 3000) : undefined,
      detailLevel,
      preferredLanguage: typeof raw.preferredLanguage === "string" ? raw.preferredLanguage : "English",
    };

    // 3. Check OpenRouter configured
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

    // 4. Generate notes
    const notes = await generateStudyNotes(input);

    return NextResponse.json({
      success: true,
      notes,
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
        {
          success: false,
          error: "OpenRouter is not configured. Please set OPENROUTER_API_KEY.",
          code: "OR_UNCONFIGURED",
        },
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
    return NextResponse.json(
      { success: false, error: msg, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
