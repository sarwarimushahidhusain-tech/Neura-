import type { EducationalPlan, EducationalPlanInput } from "@/types/ai";
import { validateEducationalPlan, ValidationError } from "./validator";

export class HuggingFaceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = "HF_ERROR"
  ) {
    super(message);
    this.name = "HuggingFaceError";
  }
}

export class HuggingFaceConfigError extends HuggingFaceError {
  constructor(message: string = "Hugging Face token is not configured. Please set HF_TOKEN in your environment.") {
    super(message, 503, "HF_UNCONFIGURED");
    this.name = "HuggingFaceConfigError";
  }
}

const HF_ROUTER_ENDPOINT = "https://router.huggingface.co/v1/chat/completions";
const DEFAULT_MODEL = "Qwen/Qwen2.5-72B-Instruct";
const REQUEST_TIMEOUT_MS = 45000;

/**
 * Checks whether Hugging Face inference is configured in the environment.
 */
export function isHuggingFaceConfigured(): boolean {
  const token = (process.env.HF_TOKEN || process.env.HUGGING_FACE_HUB_TOKEN)?.trim();
  return Boolean(token && !token.includes("your-huggingface-token") && token.length > 10);
}

/**
 * Returns the configured model identifier.
 */
export function getHuggingFaceModel(): string {
  return process.env.HF_MODEL?.trim() || DEFAULT_MODEL;
}

/**
 * Builds the strict system prompt enforcing accurate educational planning and JSON output.
 */
function buildSystemPrompt(): string {
  return [
    "You are Neura's Master Educational Visual Planning Engine.",
    "Your objective is to design accurate, scientifically and educationally sound 3D video animation plans.",
    "You MUST respond ONLY with a single valid, well-formed JSON object following this exact schema:",
    "{",
    '  "title": "Clear educational title",',
    '  "summary": "1-2 sentence core educational thesis",',
    '  "learningObjectives": ["Objective 1", "Objective 2", ...],',
    '  "keyConcepts": ["Concept 1", "Concept 2", ...],',
    '  "scenes": [',
    "    {",
    '      "sceneNumber": 1,',
    '      "title": "Scene title",',
    '      "durationSeconds": 5,',
    '      "description": "Exhaustive visual description of what happens in 3D space",',
    '      "visualObjects": ["Specific anatomical or scientific 3D models with materials"],',
    '      "environment": "Lighting, backdrop, and volumetric atmosphere",',
    '      "animationActions": "Step-by-step kinetic movement and physics",',
    '      "cameraAngleAndMovement": "Cinematic camera choreography (e.g. slow orbit, cutaway push-in)",',
    '      "lightingAndRenderStyle": "Rendering and illumination details",',
    '      "transition": "Transition into next scene",',
    '      "narration": "Exact narration script to accompany this scene",',
    '      "continuityNotes": "Rules to preserve visual continuity"',
    "    }",
    "  ],",
    '  "continuityInstructions": "Global rules for spatial, lighting, and model continuity across all scenes",',
    '  "quizQuestions": [',
    "    {",
    '      "question": "Educational concept question",',
    '      "options": ["Option A", "Option B", "Option C", "Option D"],',
    '      "correctIndex": 0,',
    '      "explanation": "Brief explanation of why this answer is correct"',
    "    }",
    "  ]",
    "}",
    "CRITICAL RULES:",
    "- Output pure JSON only. Do NOT include markdown code fences, comments, or extra text.",
    "- Ensure factual scientific accuracy; avoid unsupported pseudo-scientific claims or contradictory camera directions.",
    "- Distribute scene durations sensibly to match the target total duration.",
  ].join("\n");
}

/**
 * Builds the user prompt expressing user topic and settings.
 */
function buildUserPrompt(input: EducationalPlanInput): string {
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
    input.additionalInstructions ? `Additional User Directives: ${input.additionalInstructions}` : "",
    `Produce between 2 and 4 continuous sequential scenes that thoroughly explain this concept within the ${input.durationSeconds}s timeframe.`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Extracts and parses JSON from model response text.
 */
function extractAndParseJson(text: string): unknown {
  const trimmed = text.trim();
  // Strip markdown code fences if model enclosed JSON in ```json ... ```
  let cleaned = trimmed;
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }

  // Attempt direct parse
  try {
    return JSON.parse(cleaned);
  } catch {
    // Attempt extracting the first JSON object using bracket boundary
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const slice = cleaned.slice(firstBrace, lastBrace + 1);
      return JSON.parse(slice);
    }
    throw new ValidationError("Failed to parse model response into JSON format.");
  }
}

/**
 * Generates an educational plan using the configured Hugging Face Inference model.
 */
export async function generateEducationalPlanWithHuggingFace(
  input: EducationalPlanInput,
  retryCount: number = 0
): Promise<{ plan: EducationalPlan; modelUsed: string }> {
  const token = (process.env.HF_TOKEN || process.env.HUGGING_FACE_HUB_TOKEN)?.trim();
  if (!token || token.includes("your-huggingface-token") || token.length < 10) {
    throw new HuggingFaceConfigError();
  }

  const model = getHuggingFaceModel();
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(input);

  const payload = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.6,
    max_tokens: 2500,
    response_format: { type: "json_object" },
  };

  let response: Response;
  try {
    response = await fetch(HF_ROUTER_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new HuggingFaceError(
        "Hugging Face inference request timed out after 45 seconds.",
        504,
        "HF_TIMEOUT"
      );
    }
    throw new HuggingFaceError(
      `Network error connecting to Hugging Face: ${err instanceof Error ? err.message : "Connection failed"}`,
      502,
      "HF_NETWORK_ERROR"
    );
  }

  if (!response.ok) {
    let errorDetails = "";
    try {
      const errJson = await response.json();
      errorDetails = errJson?.error?.message || errJson?.error || JSON.stringify(errJson);
    } catch {
      errorDetails = await response.text();
    }

    // Mask any potential token leaks in error message
    const safeError = errorDetails.replace(token, "[REDACTED_TOKEN]");

    if (response.status === 401 || response.status === 403) {
      throw new HuggingFaceError(
        "Authentication failed with Hugging Face. Please verify your HF_TOKEN.",
        401,
        "HF_UNAUTHORIZED"
      );
    }

    if (response.status === 429) {
      throw new HuggingFaceError(
        "Hugging Face rate limit reached. Please wait a moment before trying again.",
        429,
        "HF_RATE_LIMIT"
      );
    }

    if (response.status === 503) {
      throw new HuggingFaceError(
        `The configured model (${model}) is currently unavailable or loading. Please try again shortly.`,
        503,
        "HF_MODEL_LOADING"
      );
    }

    throw new HuggingFaceError(
      `Hugging Face API returned status ${response.status}: ${safeError}`,
      response.status,
      "HF_API_ERROR"
    );
  }

  const rawJson = await response.json();
  const choiceContent = rawJson?.choices?.[0]?.message?.content;

  if (!choiceContent || typeof choiceContent !== "string") {
    throw new HuggingFaceError(
      "Hugging Face returned an empty or invalid message content.",
      502,
      "HF_EMPTY_CONTENT"
    );
  }

  try {
    const parsed = extractAndParseJson(choiceContent);
    const validatedPlan = validateEducationalPlan(parsed);
    return { plan: validatedPlan, modelUsed: model };
  } catch (err: unknown) {
    // If first attempt had a syntax error, perform 1 bounded retry
    if (retryCount === 0) {
      return generateEducationalPlanWithHuggingFace(input, 1);
    }
    throw new HuggingFaceError(
      `Failed to validate structured educational plan: ${err instanceof Error ? err.message : "Schema validation error"}`,
      502,
      "HF_MALFORMED_OUTPUT"
    );
  }
}
