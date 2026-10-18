/**
 * NEURA PHASE 4 — OpenRouter AI Client (Server-side only)
 *
 * Uses OPENROUTER_API_KEY and OPENROUTER_MODEL env vars.
 * Never exposed to the browser; never uses NEXT_PUBLIC_ prefix.
 */

import type { EducationalPlan, EducationalPlanInput } from "@/types/ai";
import { validateEducationalPlan, ValidationError } from "./validator";

// ---------------------------------------------------------------------------
// Error classes
// ---------------------------------------------------------------------------

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = "OR_ERROR"
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

export class OpenRouterConfigError extends OpenRouterError {
  constructor(
    message: string = "OpenRouter API key is not configured. Please set OPENROUTER_API_KEY in your environment."
  ) {
    super(message, 503, "OR_UNCONFIGURED");
    this.name = "OpenRouterConfigError";
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 60_000;

/**
 * Default free model available on OpenRouter without billing.
 * Can be overridden by OPENROUTER_MODEL env var.
 * Using meta-llama/llama-3.3-8b-instruct:free as the primary free model.
 */
const DEFAULT_MODEL = "meta-llama/llama-3.3-8b-instruct:free";

// ---------------------------------------------------------------------------
// Config helpers
// ---------------------------------------------------------------------------

export function isOpenRouterConfigured(): boolean {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  return Boolean(key && key.length > 10 && !key.includes("your-openrouter"));
}

export function getOpenRouterModel(): string {
  return process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL;
}

// ---------------------------------------------------------------------------
// Low-level fetch wrapper
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterRawResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string; code?: number };
}

async function callOpenRouterChat(
  messages: ChatMessage[],
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey || apiKey.length < 10 || apiKey.includes("your-openrouter")) {
    throw new OpenRouterConfigError();
  }

  const model = getOpenRouterModel();

  const payload = {
    model,
    messages,
    temperature: options.temperature ?? 0.6,
    max_tokens: options.maxTokens ?? 2500,
  };

  let response: Response;
  try {
    response = await fetch(OPENROUTER_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "Neura Educational Platform",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new OpenRouterError(
        "OpenRouter request timed out after 60 seconds.",
        504,
        "OR_TIMEOUT"
      );
    }
    throw new OpenRouterError(
      `Network error connecting to OpenRouter: ${err instanceof Error ? err.message : "Connection failed"}`,
      502,
      "OR_NETWORK_ERROR"
    );
  }

  if (!response.ok) {
    let errorDetails = "";
    try {
      const errJson = (await response.json()) as OpenRouterRawResponse;
      errorDetails =
        errJson?.error?.message || JSON.stringify(errJson);
    } catch {
      errorDetails = await response.text();
    }

    // Mask key in case it appears in error text
    const safeError = apiKey
      ? errorDetails.replace(apiKey, "[REDACTED_KEY]")
      : errorDetails;

    if (response.status === 401 || response.status === 403) {
      throw new OpenRouterError(
        "OpenRouter authentication failed. Please verify OPENROUTER_API_KEY.",
        401,
        "OR_UNAUTHORIZED"
      );
    }
    if (response.status === 402) {
      throw new OpenRouterError(
        "OpenRouter account has insufficient credits. Add credits at openrouter.ai/credits or use a free model.",
        402,
        "OR_INSUFFICIENT_CREDITS"
      );
    }
    if (response.status === 429) {
      throw new OpenRouterError(
        "OpenRouter rate limit reached. Please wait a moment before retrying.",
        429,
        "OR_RATE_LIMIT"
      );
    }
    if (response.status === 503 || response.status === 502) {
      throw new OpenRouterError(
        `OpenRouter or the upstream model is temporarily unavailable (HTTP ${response.status}). Try again shortly.`,
        503,
        "OR_UNAVAILABLE"
      );
    }

    throw new OpenRouterError(
      `OpenRouter returned HTTP ${response.status}: ${safeError}`,
      response.status,
      "OR_API_ERROR"
    );
  }

  const rawJson = (await response.json()) as OpenRouterRawResponse;
  const content = rawJson?.choices?.[0]?.message?.content;

  if (!content || typeof content !== "string" || !content.trim()) {
    throw new OpenRouterError(
      "OpenRouter returned an empty or invalid message content.",
      502,
      "OR_EMPTY_CONTENT"
    );
  }

  return content.trim();
}

// ---------------------------------------------------------------------------
// JSON extraction utility (reused across generators)
// ---------------------------------------------------------------------------

export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  let cleaned = trimmed;

  // Strip markdown fences
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    // Find first { ... }
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first !== -1 && last !== -1 && last > first) {
      return JSON.parse(cleaned.slice(first, last + 1));
    }
    // Find first [ ... ]
    const firstArr = cleaned.indexOf("[");
    const lastArr = cleaned.lastIndexOf("]");
    if (firstArr !== -1 && lastArr !== -1 && lastArr > firstArr) {
      return JSON.parse(cleaned.slice(firstArr, lastArr + 1));
    }
    throw new ValidationError("Failed to extract valid JSON from model response.");
  }
}

// ---------------------------------------------------------------------------
// Educational Plan generation via OpenRouter
// ---------------------------------------------------------------------------

function buildEducationalPlanSystemPrompt(): string {
  return [
    "You are Neura's Master Educational Visual Planning Engine.",
    "Your objective is to design accurate, scientifically and educationally sound 3D video animation plans.",
    "You MUST respond ONLY with a single valid, well-formed JSON object following this exact schema:",
    "{",
    '  "title": "Clear educational title",',
    '  "summary": "1-2 sentence core educational thesis",',
    '  "learningObjectives": ["Objective 1", "Objective 2"],',
    '  "keyConcepts": ["Concept 1", "Concept 2"],',
    '  "scenes": [',
    "    {",
    '      "sceneNumber": 1,',
    '      "title": "Scene title",',
    '      "durationSeconds": 5,',
    '      "description": "Exhaustive visual description",',
    '      "visualObjects": ["Specific 3D models"],',
    '      "environment": "Lighting and backdrop",',
    '      "animationActions": "Step-by-step kinetic movement",',
    '      "cameraAngleAndMovement": "Cinematic camera choreography",',
    '      "lightingAndRenderStyle": "Rendering details",',
    '      "transition": "Transition into next scene",',
    '      "narration": "Exact narration script",',
    '      "continuityNotes": "Rules to preserve visual continuity"',
    "    }",
    "  ],",
    '  "continuityInstructions": "Global rules for spatial continuity",',
    '  "quizQuestions": [',
    "    {",
    '      "question": "Question text",',
    '      "options": ["Option A", "Option B", "Option C", "Option D"],',
    '      "correctIndex": 0,',
    '      "explanation": "Brief explanation"',
    "    }",
    "  ]",
    "}",
    "CRITICAL RULES:",
    "- Output pure JSON only. Do NOT include markdown code fences, comments, or extra text.",
    "- Ensure factual scientific accuracy.",
    "- Distribute scene durations sensibly to match the target total duration.",
    "- Produce 2 to 4 scenes.",
    "- Include 2 to 5 quiz questions.",
  ].join("\n");
}

function buildEducationalPlanUserPrompt(input: EducationalPlanInput): string {
  return [
    `Create a structured educational video plan for the following topic:`,
    `Topic: "${input.topic}"`,
    `Educational Level: ${input.educationLevel}`,
    `Visual Style: ${input.visualStyle}`,
    `Aspect Ratio: ${input.aspectRatio}`,
    `Target Duration: ${input.durationSeconds} seconds`,
    `Preferred Language: ${input.preferredLanguage || "English"}`,
    input.targetAudience ? `Target Audience: ${input.targetAudience}` : "",
    input.narrationPreference ? `Narration Style: ${input.narrationPreference}` : "",
    input.additionalInstructions
      ? `Additional User Directives: ${input.additionalInstructions}`
      : "",
    `Produce between 2 and 4 continuous sequential scenes that thoroughly explain this concept within the ${input.durationSeconds}s timeframe.`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Generates an educational plan using OpenRouter.
 * Returns the validated plan and model identifier.
 */
export async function generateEducationalPlanWithOpenRouter(
  input: EducationalPlanInput,
  retryCount = 0
): Promise<{ plan: EducationalPlan; modelUsed: string }> {
  const messages: ChatMessage[] = [
    { role: "system", content: buildEducationalPlanSystemPrompt() },
    { role: "user", content: buildEducationalPlanUserPrompt(input) },
  ];

  const rawText = await callOpenRouterChat(messages, {
    maxTokens: 3000,
    temperature: 0.6,
  });

  const model = getOpenRouterModel();

  try {
    const parsed = extractJson(rawText);
    const validatedPlan = validateEducationalPlan(parsed);
    return { plan: validatedPlan, modelUsed: model };
  } catch (err: unknown) {
    if (retryCount === 0) {
      return generateEducationalPlanWithOpenRouter(input, 1);
    }
    throw new OpenRouterError(
      `Failed to validate structured educational plan from OpenRouter: ${
        err instanceof Error ? err.message : "Schema validation error"
      }`,
      502,
      "OR_MALFORMED_OUTPUT"
    );
  }
}

// ---------------------------------------------------------------------------
// Generic text generation (used by notes & MCQ generators)
// ---------------------------------------------------------------------------

export { callOpenRouterChat };
export type { ChatMessage };
