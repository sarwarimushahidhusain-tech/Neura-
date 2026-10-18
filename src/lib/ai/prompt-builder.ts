import type { EducationalPlan, EducationalPlanInput } from "@/types/ai";

/**
 * Builds an ultra-detailed, cinematic Master Prompt tailored for
 * modern 3D educational video-generation architectures (e.g. HunyuanVideo, LTX, CogVideoX).
 */
export function buildMasterPrompt(
  plan: EducationalPlan,
  input: EducationalPlanInput
): string {
  const scenesSummary = plan.scenes
    .map(
      (s) =>
        `Scene ${s.sceneNumber} (${s.durationSeconds}s): [${s.title}] Visuals: ${s.description}. Key 3D Objects: ${s.visualObjects.join(", ")}. Environment: ${s.environment}. Camera: ${s.cameraAngleAndMovement}. Motion: ${s.animationActions}. Lighting: ${s.lightingAndRenderStyle}. Transition: ${s.transition}.`
    )
    .join(" ");

  const visualStyleDescriptors: Record<string, string> = {
    cinematic: "Ultra-photorealistic 8K render, Octane Render style, volumetric lighting, deep shadows, cinematic depth of field, high dynamic range (HDR)",
    educational: "Clean, pristine 3D medical/scientific scientific textbook visualization, clear cutaway transparency, anatomical precision, vivid contrasting colors for distinct components",
    stylized: "Stylized vibrant 3D animation, Pixar-inspired smooth materials, clean ambient occlusion, expressive lighting, friendly educational aesthetic",
    realistic: "Documentary-grade physical realism, natural physics and fluid mechanics, realistic micro-textures, true-to-life scale and biological fidelity",
  };

  const styleDescription = visualStyleDescriptors[input.visualStyle] || visualStyleDescriptors.cinematic;

  const negativeDirectives = [
    "no text overlays",
    "no subtitles",
    "no 2D cartoon outlines",
    "no watermarks",
    "no blurry artifacts",
    "no morphing distortions",
    "no anatomical or scientific inaccuracies",
    "no sudden cuts without continuous spatial anchoring",
  ].join(", ");

  const prompt = [
    `Create a highly detailed, continuous 3D educational video visualization titled "${plan.title}".`,
    `Subject: ${plan.summary}`,
    `Core Learning Objective: ${plan.learningObjectives.join("; ")}.`,
    `Visual Style & Rendering: ${styleDescription}. Aspect Ratio: ${input.aspectRatio}. Target Duration: ${input.durationSeconds} seconds.`,
    `Scene Sequence & Motion Choreography: ${scenesSummary}`,
    `Continuity & Spatial Coherence: ${plan.continuityInstructions}`,
    `Narration Context & Pacing: Designed to synchronize with educational narration explaining ${plan.keyConcepts.join(", ")}.`,
    `Quality & Negative Directives: Pristine 3D graphics fidelity, perfect optical focus, ${negativeDirectives}.`,
  ].join(" ");

  return prompt.trim();
}
