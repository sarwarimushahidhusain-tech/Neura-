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

// ---------------------------------------------------------------------------
// Error classes & Types
// ---------------------------------------------------------------------------

export interface OpenRouterErrorMetadata {
  status?: number;
  message?: string;
  errorType?: string;
  providerCode?: string;
  providerName?: string;
  selectedModel?: string;
  elapsedMs?: number;
  generationId?: string;
}

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = "OR_ERROR",
    public metadata?: OpenRouterErrorMetadata
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
// Constants & Models
// ---------------------------------------------------------------------------

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_TIMEOUT_MS = 40_000; // 40s per attempt to prevent 90s gateway hangs
const MAX_RETRIES = 2; // Up to 3 total attempts

/**
 * Verified active free models on OpenRouter with confirmed availability and JSON output.
 * Primary default can be overridden by OPENROUTER_MODEL env var.
 */
export const DEFAULT_MODEL = "nvidia/nemotron-3.5-lightning:free";
export const FALLBACK_FREE_MODELS = [
  "nvidia/nemotron-3.5-lightning:free",
  "nvidia/nemotron-3.5-super-vl:free",
  "minimax/minimax-m3.1-flash:free",
];

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
// Low-level fetch wrapper with Bounded Retries & Verified Fallbacks
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterCallOptions {
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  model?: string;
  disableReasoning?: boolean;
}

export interface OpenRouterChatResult {
  content: string;
  modelUsed: string;
  generationId?: string;
  elapsedMs: number;
}

interface OpenRouterRawResponse {
  id?: string;
  choices?: Array<{
    finish_reason?: string;
    message?: {
      content?: string | null;
      reasoning?: string | null;
    };
  }>;
  error?: {
    message?: string;
    code?: number | string;
    metadata?: {
      error_type?: string;
      provider_error_code?: number | string;
      raw?: string;
    };
  };
}

/**
 * Executes a chat completion request to OpenRouter with:
 * - Bounded retries (max 2 retries, 3 total attempts)
 * - Exponential backoff with random jitter
 * - Automatic model fallback on transient failures (504, 502, 503, 429, timeouts)
 * - Safe metadata capture (no secrets/keys logged)
 * - Reasoning token suppression to prevent token limit starvation
 */
export async function callOpenRouterChatDetailed(
  messages: ChatMessage[],
  options: OpenRouterCallOptions = {}
): Promise<OpenRouterChatResult> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey || apiKey.length < 10 || apiKey.includes("your-openrouter")) {
    throw new OpenRouterConfigError();
  }

  const primaryModel = options.model || getOpenRouterModel();
  const fallbackCandidates = FALLBACK_FREE_MODELS.filter((m) => m !== primaryModel);
  const modelQueue = [primaryModel, ...fallbackCandidates];

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let lastError: OpenRouterError | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const currentModel = modelQueue[attempt] || modelQueue[0];
    const attemptStart = Date.now();

    const payload: Record<string, unknown> = {
      model: currentModel,
      messages,
      temperature: options.temperature ?? 0.4,
      max_tokens: options.maxTokens ?? 2500,
    };

    // Suppress reasoning tokens by default so tokens are spent on structured JSON output
    if (options.disableReasoning !== false) {
      payload.reasoning = { effort: "none" };
    }

    let response: Response;
    let generationId = "";
    let providerName = "";

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
        signal: AbortSignal.timeout(timeoutMs),
      });

      generationId = response.headers.get("x-generation-id") || "";
      providerName = response.headers.get("x-provider-name") || "";
    } catch (fetchErr: unknown) {
      const elapsedMs = Date.now() - attemptStart;
      const isTimeout =
        fetchErr instanceof Error &&
        (fetchErr.name === "TimeoutError" || fetchErr.name === "AbortError");

      if (isTimeout) {
        lastError = new OpenRouterError(
          `OpenRouter request timed out after ${Math.round(elapsedMs / 1000)}s on model "${currentModel}".`,
          504,
          "OR_TIMEOUT",
          {
            status: 504,
            errorType: "upstream_timeout",
            selectedModel: currentModel,
            elapsedMs,
          }
        );
      } else {
        const netMsg = fetchErr instanceof Error ? fetchErr.message : "Connection failed";
        lastError = new OpenRouterError(
          `Network error connecting to OpenRouter: ${netMsg}`,
          502,
          "OR_NETWORK_ERROR",
          {
            status: 502,
            errorType: "network_error",
            selectedModel: currentModel,
            elapsedMs,
          }
        );
      }

      if (attempt < MAX_RETRIES) {
        const jitter = Math.random() * 400;
        const backoffMs = Math.min(1000 * Math.pow(1.8, attempt) + jitter, 4000);
        const nextModel = modelQueue[attempt + 1] || modelQueue[0];
        console.warn(
          `[OpenRouter] Attempt ${attempt + 1}/${MAX_RETRIES + 1} timed out or network error on "${currentModel}" after ${elapsedMs}ms. Retrying with fallback model "${nextModel}" in ${Math.round(backoffMs)}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      throw lastError;
    }

    const elapsedMs = Date.now() - attemptStart;

    if (!response.ok) {
      let errorDetails = "";
      let errorType = "";
      let providerCode = "";

      try {
        const errJson = (await response.json()) as OpenRouterRawResponse;
        errorDetails = errJson?.error?.message || JSON.stringify(errJson);
        errorType = errJson?.error?.metadata?.error_type || "";
        providerCode = errJson?.error?.metadata?.provider_error_code
          ? String(errJson.error.metadata.provider_error_code)
          : "";
      } catch {
        errorDetails = await response.text();
      }

      // Strictly mask API key in any error text to avoid credential leaks
      const safeError = apiKey ? errorDetails.replaceAll(apiKey, "[REDACTED]") : errorDetails;

      const metadata: OpenRouterErrorMetadata = {
        status: response.status,
        message: safeError,
        errorType,
        providerCode,
        providerName,
        selectedModel: currentModel,
        elapsedMs,
        generationId,
      };

      // Non-transient errors: do not retry
      if (response.status === 401 || response.status === 403) {
        throw new OpenRouterError(
          "OpenRouter authentication failed. Please verify OPENROUTER_API_KEY in .env.local.",
          401,
          "OR_UNAUTHORIZED",
          metadata
        );
      }
      if (response.status === 402) {
        throw new OpenRouterError(
          "OpenRouter account has insufficient credits. Add credits or use an active free model.",
          402,
          "OR_INSUFFICIENT_CREDITS",
          metadata
        );
      }

      // Transient or model availability errors: 504, 502, 503, 429, 408, 404, or retired model ID
      const isTransient =
        response.status === 504 ||
        response.status === 502 ||
        response.status === 503 ||
        response.status === 429 ||
        response.status === 408 ||
        response.status === 404 ||
        (response.status === 400 && safeError.includes("not a valid model ID"));

      if (isTransient && attempt < MAX_RETRIES) {
        let backoffMs = Math.min(1000 * Math.pow(1.8, attempt) + Math.random() * 400, 4000);
        const retryAfterHeader = response.headers.get("retry-after");
        if (retryAfterHeader) {
          const parsedSec = parseInt(retryAfterHeader, 10);
          if (!isNaN(parsedSec) && parsedSec > 0 && parsedSec <= 10) {
            backoffMs = parsedSec * 1000;
          }
        }

        const nextModel = modelQueue[attempt + 1] || modelQueue[0];
        console.warn(
          `[OpenRouter] Transient HTTP ${response.status} (${errorType || "provider error"}) on model "${currentModel}" after ${elapsedMs}ms (generation: ${generationId || "none"}). Retrying with fallback "${nextModel}" in ${Math.round(backoffMs)}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      if (response.status === 504) {
        throw new OpenRouterError(
          `OpenRouter upstream provider timed out (HTTP 504) on model "${currentModel}".`,
          504,
          "OR_TIMEOUT",
          metadata
        );
      }
      if (response.status === 429) {
        throw new OpenRouterError(
          "OpenRouter rate limit reached. Please wait a moment before retrying.",
          429,
          "OR_RATE_LIMIT",
          metadata
        );
      }

      throw new OpenRouterError(
        `OpenRouter returned HTTP ${response.status}: ${safeError}`,
        response.status,
        "OR_API_ERROR",
        metadata
      );
    }

    // Success response parsing
    const rawJson = (await response.json()) as OpenRouterRawResponse;
    const choice = rawJson?.choices?.[0];
    let content = choice?.message?.content;

    // Handle models that emit output inside reasoning block
    if (
      (!content || typeof content !== "string" || !content.trim()) &&
      typeof choice?.message?.reasoning === "string" &&
      choice.message.reasoning.includes("{")
    ) {
      content = choice.message.reasoning;
    }

    if (!content || typeof content !== "string" || !content.trim()) {
      if (attempt < MAX_RETRIES) {
        const nextModel = modelQueue[attempt + 1] || modelQueue[0];
        console.warn(
          `[OpenRouter] Model "${currentModel}" returned empty content. Retrying with fallback "${nextModel}"...`
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
      throw new OpenRouterError(
        `OpenRouter model "${currentModel}" returned an empty response.`,
        502,
        "OR_EMPTY_CONTENT",
        {
          status: 200,
          selectedModel: currentModel,
          elapsedMs,
          generationId,
        }
      );
    }

    return {
      content: content.trim(),
      modelUsed: currentModel,
      generationId,
      elapsedMs,
    };
  }

  throw (
    lastError ||
    new OpenRouterError("OpenRouter failed after bounded retries.", 504, "OR_TIMEOUT")
  );
}

/**
 * Backward-compatible helper returning pure string content.
 */
export async function callOpenRouterChat(
  messages: ChatMessage[],
  options: OpenRouterCallOptions = {},
  attemptModel?: string
): Promise<string> {
  const result = await callOpenRouterChatDetailed(messages, {
    ...options,
    model: attemptModel || options.model,
  });
  return result.content;
}

// ---------------------------------------------------------------------------
// JSON extraction utility (reused across generators)
// ---------------------------------------------------------------------------

function repairTruncatedJson(str: string): string {
  let s = str.trim();
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (ch === "{") openBraces++;
      else if (ch === "}") openBraces = Math.max(0, openBraces - 1);
      else if (ch === "[") openBrackets++;
      else if (ch === "]") openBrackets = Math.max(0, openBrackets - 1);
    }
  }

  if (inString) {
    s += '"';
  }
  s = s.replace(/,\s*$/, "");
  while (openBrackets > 0) {
    s += "]";
    openBrackets--;
  }
  while (openBraces > 0) {
    s += "}";
    openBraces--;
  }
  return s;
}

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
    try {
      return JSON.parse(repairTruncatedJson(cleaned));
    } catch {
      const first = cleaned.indexOf("{");
      if (first !== -1) {
        const last = cleaned.lastIndexOf("}");
        if (last > first) {
          try {
            return JSON.parse(cleaned.slice(first, last + 1));
          } catch {
            return JSON.parse(repairTruncatedJson(cleaned.slice(first, last + 1)));
          }
        }
        return JSON.parse(repairTruncatedJson(cleaned.slice(first)));
      }
      throw new ValidationError("Failed to extract valid JSON from model response.");
    }
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
    '      "description": "Clear visual description (1-2 sentences)",',
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
    "- Output pure JSON only. Do NOT include markdown code fences, comments, or introductory text.",
    "- Keep each scene description concise and focused (1-2 sentences).",
    "- Ensure factual scientific accuracy.",
    "- Distribute scene durations sensibly to match the target total duration.",
    "- Produce between 2 and 4 scenes.",
    "- Include 2 quiz questions.",
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

  const result = await callOpenRouterChatDetailed(messages, {
    maxTokens: 2500,
    temperature: 0.4,
    timeoutMs: 40_000,
  });

  try {
    const parsed = extractJson(result.content);
    const validatedPlan = validateEducationalPlan(parsed);
    return { plan: validatedPlan, modelUsed: result.modelUsed };
  } catch (err: unknown) {
    if (retryCount === 0) {
      console.warn(
        `[OpenRouter] Plan schema parsing failed on model "${result.modelUsed}": ${err instanceof Error ? err.message : "Schema error"
        }. Retrying with alternate fallback model...`
      );
      const fallbackModel =
        FALLBACK_FREE_MODELS.find((m) => m !== result.modelUsed) || FALLBACK_FREE_MODELS[0];
      const fallbackResult = await callOpenRouterChatDetailed(messages, {
        maxTokens: 2500,
        temperature: 0.3,
        timeoutMs: 40_000,
        model: fallbackModel,
      });
      const parsedFallback = extractJson(fallbackResult.content);
      const validatedFallback = validateEducationalPlan(parsedFallback);
      return { plan: validatedFallback, modelUsed: fallbackResult.modelUsed };
    }
    throw new OpenRouterError(
      `Failed to validate structured educational plan from OpenRouter: ${err instanceof Error ? err.message : "Schema validation error"
      }`,
      502,
      "OR_MALFORMED_OUTPUT"
    );
  }
}
