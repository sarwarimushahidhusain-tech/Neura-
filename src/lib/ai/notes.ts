/**
 * NEURA PHASE 4 — Educational Study Notes Generator (Server-side)
 *
 * Generates structured study notes grounded in the supplied lesson plan.
 * Never claims to have analyzed video content that was not actually processed.
 */

import type { StudyNotes, NotesGenerationInput, DefinitionEntry, ConceptSection } from "@/types/phase4";
import {
  callOpenRouterChat,
  extractJson,
  OpenRouterError,
  isOpenRouterConfigured,
  getOpenRouterModel,
} from "./openrouter";
import { ValidationError } from "./validator";

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

function buildNotesSystemPrompt(detailLevel: "quick" | "detailed"): string {
  const depthInstr =
    detailLevel === "quick"
      ? "Generate concise, scannable QUICK REVISION notes. Use short sentences. Focus on definitions, key facts, and takeaways."
      : "Generate comprehensive DETAILED STUDY notes. Include thorough explanations, real-world examples, and step-by-step reasoning where appropriate.";

  return [
    "You are Neura's Educational Notes Generator.",
    depthInstr,
    "You MUST respond ONLY with a single valid JSON object matching this exact schema:",
    "{",
    '  "title": "Topic title",',
    '  "learningObjectives": ["Objective 1", "..."],',
    '  "definitions": [{ "term": "Term", "definition": "Clear definition" }],',
    '  "mainConcepts": [',
    '    { "concept": "Concept name", "explanation": "Explanation", "examples": ["Example 1"] }',
    "  ],",
    '  "stepByStepExplanations": ["Step 1: ...", "Step 2: ..."],',
    '  "keyTakeaways": ["Takeaway 1", "..."],',
    '  "revisionSummary": "2-4 sentence summary for final review"',
    "}",
    "RULES:",
    "- Output pure JSON only — no markdown fences, no extra text.",
    "- Ground ALL content strictly in the lesson plan provided. Do NOT invent claims about video scenes or audio not present in the input.",
    "- Mark any uncertainty. Do not present speculation as fact.",
    "- Avoid pseudo-scientific claims.",
  ].join("\n");
}

function buildNotesUserPrompt(input: NotesGenerationInput): string {
  const { topic, plan, masterPrompt, transcript, detailLevel } = input;

  const sceneDescriptions = plan.scenes
    .map(
      (s) =>
        `Scene ${s.sceneNumber} "${s.title}": ${s.description}. Narration: "${s.narration}".`
    )
    .join(" ");

  const lines = [
    `Generate ${detailLevel === "quick" ? "quick revision" : "detailed study"} notes for:`,
    `Topic: "${topic}"`,
    ``,
    `=== LESSON PLAN (source of truth) ===`,
    `Title: ${plan.title}`,
    `Summary: ${plan.summary}`,
    `Learning Objectives: ${plan.learningObjectives.join("; ")}`,
    `Key Concepts: ${plan.keyConcepts.join(", ")}`,
    `Scenes: ${sceneDescriptions}`,
    ``,
  ];

  if (masterPrompt) {
    lines.push(
      `=== VIDEO MASTER PROMPT (intended visual script — not proof of rendered content) ===`,
      masterPrompt.slice(0, 800),
      ``
    );
  }

  if (transcript) {
    lines.push(
      `=== AVAILABLE TRANSCRIPT/SCENE TEXT (verified content) ===`,
      transcript.slice(0, 2000),
      ``
    );
  }

  lines.push(
    `Base all notes on the lesson plan above. Do not invent facts not present in the plan.`,
    `Language: ${input.preferredLanguage || "English"}`
  );

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Response validation
// ---------------------------------------------------------------------------

function validateNotesResponse(raw: unknown): Omit<StudyNotes, "detailLevel" | "generatedAt" | "modelUsed" | "sourceDisclaimer"> {
  if (!raw || typeof raw !== "object") {
    throw new ValidationError("Notes response is not a JSON object.");
  }
  const obj = raw as Record<string, unknown>;

  const title =
    typeof obj.title === "string" && obj.title.trim()
      ? obj.title.trim()
      : "Study Notes";

  const learningObjectives: string[] = Array.isArray(obj.learningObjectives)
    ? obj.learningObjectives.filter((x): x is string => typeof x === "string").map((s) => s.trim())
    : [];

  const definitions: DefinitionEntry[] = Array.isArray(obj.definitions)
    ? obj.definitions
        .filter((d): d is Record<string, unknown> => Boolean(d && typeof d === "object"))
        .map((d) => ({
          term: typeof d.term === "string" ? d.term.trim() : "Term",
          definition: typeof d.definition === "string" ? d.definition.trim() : "Definition",
        }))
    : [];

  const mainConcepts: ConceptSection[] = Array.isArray(obj.mainConcepts)
    ? obj.mainConcepts
        .filter((c): c is Record<string, unknown> => Boolean(c && typeof c === "object"))
        .map((c) => ({
          concept: typeof c.concept === "string" ? c.concept.trim() : "Concept",
          explanation: typeof c.explanation === "string" ? c.explanation.trim() : "",
          examples: Array.isArray(c.examples)
            ? c.examples.filter((e): e is string => typeof e === "string").map((e) => e.trim())
            : [],
        }))
    : [];

  const stepByStepExplanations: string[] = Array.isArray(obj.stepByStepExplanations)
    ? obj.stepByStepExplanations.filter((s): s is string => typeof s === "string").map((s) => s.trim())
    : [];

  const keyTakeaways: string[] = Array.isArray(obj.keyTakeaways)
    ? obj.keyTakeaways.filter((s): s is string => typeof s === "string").map((s) => s.trim())
    : [];

  const revisionSummary =
    typeof obj.revisionSummary === "string" && obj.revisionSummary.trim()
      ? obj.revisionSummary.trim()
      : "Review the key concepts and definitions above.";

  return {
    title,
    learningObjectives,
    definitions,
    mainConcepts,
    stepByStepExplanations,
    keyTakeaways,
    revisionSummary,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export { isOpenRouterConfigured };

/**
 * Generates structured educational study notes via OpenRouter.
 * Raises OpenRouterConfigError if not configured, OpenRouterError on failure.
 */
export async function generateStudyNotes(
  input: NotesGenerationInput,
  retryCount = 0
): Promise<StudyNotes> {
  const messages = [
    { role: "system" as const, content: buildNotesSystemPrompt(input.detailLevel) },
    { role: "user" as const, content: buildNotesUserPrompt(input) },
  ];

  const rawText = await callOpenRouterChat(messages, {
    maxTokens: input.detailLevel === "detailed" ? 3500 : 2000,
    temperature: 0.5,
  });

  const model = getOpenRouterModel();

  try {
    const parsed = extractJson(rawText);
    const validated = validateNotesResponse(parsed);

    const sourceDisclaimer = input.transcript
      ? "These notes are grounded in the lesson plan and provided transcript/scene text."
      : "These notes are grounded in the lesson plan. No video or audio content was analyzed.";

    return {
      ...validated,
      detailLevel: input.detailLevel,
      generatedAt: new Date().toISOString(),
      modelUsed: model,
      sourceDisclaimer,
    };
  } catch (err: unknown) {
    if (retryCount === 0) {
      return generateStudyNotes(input, 1);
    }
    throw new OpenRouterError(
      `Failed to parse study notes from model: ${err instanceof Error ? err.message : "Schema error"}`,
      502,
      "OR_NOTES_MALFORMED"
    );
  }
}
