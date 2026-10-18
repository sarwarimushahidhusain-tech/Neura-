import type {
  EducationalPlanInput,
  EducationalPlan,
  ScenePlan,
  QuizQuestion,
  EducationLevel,
  AspectRatio,
  VisualStyle,
  NarrationPreference,
} from "@/types/ai";

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Validates user input before sending to the AI planning service.
 */
export function validateEducationalPlanInput(data: unknown): EducationalPlanInput {
  if (!data || typeof data !== "object") {
    throw new ValidationError("Input must be a valid JSON object.");
  }

  const raw = data as Record<string, unknown>;

  // Topic validation
  if (typeof raw.topic !== "string" || !raw.topic.trim()) {
    throw new ValidationError("Topic is required.", "topic");
  }
  const topic = raw.topic.trim();
  if (topic.length < 3) {
    throw new ValidationError("Topic must be at least 3 characters long.", "topic");
  }
  if (topic.length > 1000) {
    throw new ValidationError("Topic cannot exceed 1000 characters.", "topic");
  }

  // Education level
  const allowedLevels: EducationLevel[] = ["kids", "middle_school", "highschool", "college", "expert"];
  const levelStr = String(raw.educationLevel || "college").toLowerCase();
  const educationLevel: EducationLevel = allowedLevels.includes(levelStr as EducationLevel)
    ? (levelStr as EducationLevel)
    : "college";

  // Aspect ratio
  const allowedRatios: AspectRatio[] = ["16:9", "9:16", "1:1"];
  const ratioStr = String(raw.aspectRatio || "16:9");
  const aspectRatio: AspectRatio = allowedRatios.includes(ratioStr as AspectRatio)
    ? (ratioStr as AspectRatio)
    : "16:9";

  // Visual style
  const allowedStyles: VisualStyle[] = ["cinematic", "educational", "stylized", "realistic"];
  const styleStr = String(raw.visualStyle || "cinematic").toLowerCase();
  const visualStyle: VisualStyle = allowedStyles.includes(styleStr as VisualStyle)
    ? (styleStr as VisualStyle)
    : "cinematic";

  // Duration
  let durationSeconds = Number(raw.durationSeconds);
  if (isNaN(durationSeconds) || durationSeconds < 5) durationSeconds = 10;
  if (durationSeconds > 60) durationSeconds = 60;

  // Narration preference
  const allowedNarrations: NarrationPreference[] = ["voiceover", "subtitles_only", "visual_cues"];
  const narStr = String(raw.narrationPreference || "voiceover").toLowerCase();
  const narrationPreference: NarrationPreference = allowedNarrations.includes(narStr as NarrationPreference)
    ? (narStr as NarrationPreference)
    : "voiceover";

  return {
    topic,
    educationLevel,
    targetAudience: typeof raw.targetAudience === "string" ? raw.targetAudience.trim() : undefined,
    preferredLanguage: typeof raw.preferredLanguage === "string" && raw.preferredLanguage.trim() ? raw.preferredLanguage.trim() : "English",
    durationSeconds,
    aspectRatio,
    visualStyle,
    narrationPreference,
    additionalInstructions: typeof raw.additionalInstructions === "string" ? raw.additionalInstructions.trim().slice(0, 500) : undefined,
  };
}

/**
 * Validates and normalizes structured educational plan returned by the AI model.
 */
export function validateEducationalPlan(raw: unknown): EducationalPlan {
  if (!raw || typeof raw !== "object") {
    throw new ValidationError("Model response is not a valid JSON object.");
  }

  const obj = raw as Record<string, unknown>;

  // Title
  const title = typeof obj.title === "string" && obj.title.trim()
    ? obj.title.trim()
    : "Untitled Educational Animation";

  // Summary
  const summary = typeof obj.summary === "string" && obj.summary.trim()
    ? obj.summary.trim()
    : "Visual educational exploration.";

  // Learning Objectives
  let learningObjectives: string[] = [];
  if (Array.isArray(obj.learningObjectives)) {
    learningObjectives = obj.learningObjectives
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .map((s) => s.trim());
  }
  if (learningObjectives.length === 0) {
    learningObjectives = ["Understand the core visual concepts of the topic."];
  }

  // Key Concepts
  let keyConcepts: string[] = [];
  if (Array.isArray(obj.keyConcepts)) {
    keyConcepts = obj.keyConcepts
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .map((s) => s.trim());
  }
  if (keyConcepts.length === 0) {
    keyConcepts = ["Visual Representation", "Scientific Mechanism"];
  }

  // Scenes
  if (!Array.isArray(obj.scenes) || obj.scenes.length === 0) {
    throw new ValidationError("Educational plan must contain at least one structured scene.");
  }

  const scenes: ScenePlan[] = obj.scenes.map((s: unknown, index: number) => {
    const sObj = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;

    let visualObjects: string[] = [];
    if (Array.isArray(sObj.visualObjects)) {
      visualObjects = sObj.visualObjects
        .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
        .map((v) => v.trim());
    }

    return {
      sceneNumber: typeof sObj.sceneNumber === "number" ? sObj.sceneNumber : index + 1,
      title: typeof sObj.title === "string" && sObj.title.trim() ? sObj.title.trim() : `Scene ${index + 1}`,
      durationSeconds: typeof sObj.durationSeconds === "number" && sObj.durationSeconds > 0 ? sObj.durationSeconds : 5,
      description: typeof sObj.description === "string" && sObj.description.trim() ? sObj.description.trim() : "Detailed visual visualization.",
      visualObjects: visualObjects.length > 0 ? visualObjects : ["Core 3D Anatomical / Scientific Subject"],
      environment: typeof sObj.environment === "string" && sObj.environment.trim() ? sObj.environment.trim() : "Clean dark studio lighting environment",
      animationActions: typeof sObj.animationActions === "string" && sObj.animationActions.trim() ? sObj.animationActions.trim() : "Continuous fluid 3D motion.",
      cameraAngleAndMovement: typeof sObj.cameraAngleAndMovement === "string" && sObj.cameraAngleAndMovement.trim() ? sObj.cameraAngleAndMovement.trim() : "Smooth tracking cinematic camera.",
      lightingAndRenderStyle: typeof sObj.lightingAndRenderStyle === "string" && sObj.lightingAndRenderStyle.trim() ? sObj.lightingAndRenderStyle.trim() : "Volumetric highlights with subsurface scattering.",
      transition: typeof sObj.transition === "string" && sObj.transition.trim() ? sObj.transition.trim() : "Smooth cross-dissolve to next viewpoint.",
      narration: typeof sObj.narration === "string" && sObj.narration.trim() ? sObj.narration.trim() : "Narration highlighting key scientific processes.",
      continuityNotes: typeof sObj.continuityNotes === "string" && sObj.continuityNotes.trim() ? sObj.continuityNotes.trim() : "Maintain exact object proportions and color palette across camera cuts.",
    };
  });

  // Continuity Instructions
  const continuityInstructions = typeof obj.continuityInstructions === "string" && obj.continuityInstructions.trim()
    ? obj.continuityInstructions.trim()
    : "Maintain strict visual continuity, consistent spatial lighting, and stable geometric anchors throughout.";

  // Quiz Questions
  let quizQuestions: QuizQuestion[] = [];
  if (Array.isArray(obj.quizQuestions)) {
    quizQuestions = obj.quizQuestions
      .filter((q): q is Record<string, unknown> => Boolean(q && typeof q === "object"))
      .map((q) => {
        const options = Array.isArray(q.options)
          ? q.options.filter((opt): opt is string => typeof opt === "string")
          : ["True", "False"];
        const correctIndex = typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex < options.length
          ? q.correctIndex
          : 0;

        return {
          question: typeof q.question === "string" ? q.question.trim() : "What is the primary concept demonstrated?",
          options: options.length >= 2 ? options : ["Correct concept", "Distractor concept"],
          correctIndex,
          explanation: typeof q.explanation === "string" ? q.explanation.trim() : "Demonstrated clearly by the visual scene animation.",
        };
      });
  }

  return {
    title,
    summary,
    learningObjectives,
    keyConcepts,
    scenes,
    continuityInstructions,
    quizQuestions,
  };
}
