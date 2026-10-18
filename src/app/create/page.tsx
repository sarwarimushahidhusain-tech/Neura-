"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Loader2,
  PlaySquare,
  AlertCircle,
  Copy,
  Check,
  RotateCcw,
  ArrowRight,
  Film,
  BookOpen,
  Camera,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { EducationalPlan } from "@/types/ai";
import { saveProject } from "@/lib/projects";

const MAX_CHARS = 1000;

const SUGGESTIONS = [
  { label: "Cinematic camera", id: "Cinematic 3D camera choreography" },
  { label: "Realistic lighting", id: "Physically based volumetric lighting" },
  { label: "Scientific accuracy", id: "Strict anatomical and scientific fidelity" },
  { label: "Smooth motion", id: "Fluid continuous kinetic simulation" },
  { label: "High detail anatomy", id: "Detailed cross-section and cutaway transparency" },
  { label: "Educational clarity", id: "Pristine textbook clarity for students" },
];

export default function CreatePage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("cinematic");
  const [ratio, setRatio] = useState("16:9");
  const [duration, setDuration] = useState("10");
  const [audience, setAudience] = useState("college");
  const [language, setLanguage] = useState("English");
  const [narration, setNarration] = useState("voiceover");

  const [isGenerating, setIsGenerating] = useState(false);
  const [activeChips, setActiveChips] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [focusAnimStep, setFocusAnimStep] = useState(-1);

  // Phase 2 AI Planning & Prompt Review State
  const [generatedPlan, setGeneratedPlan] = useState<EducationalPlan | null>(null);
  const [masterPrompt, setMasterPrompt] = useState("");
  const [originalPrompt, setOriginalPrompt] = useState("");
  const [modelUsed, setModelUsed] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isHfMissing, setIsHfMissing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isProceeding, setIsProceeding] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("neura_topic");
      if (saved) {
        setTimeout(() => setTopic(saved), 0);
        localStorage.removeItem("neura_topic");
      }
    }
  }, []);

  useEffect(() => {
    if (isFocused) {
      setTimeout(() => setFocusAnimStep(0), 0);
      const t1 = setTimeout(() => setFocusAnimStep(1), 600);
      const t2 = setTimeout(() => setFocusAnimStep(2), 1200);
      const t3 = setTimeout(() => setFocusAnimStep(3), 1800);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    } else {
      setTimeout(() => setFocusAnimStep(-1), 0);
    }
  }, [isFocused]);

  const toggleChip = (id: string) => {
    setActiveChips((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const getCharColor = () => {
    const pct = topic.length / MAX_CHARS;
    if (pct > 0.9) return "text-destructive";
    if (pct > 0.75) return "text-amber-500";
    return "text-muted-foreground";
  };

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || isGenerating) return;

    setIsGenerating(true);
    setErrorMessage(null);
    setIsHfMissing(false);

    try {
      const response = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          educationLevel: audience,
          durationSeconds: Number(duration),
          aspectRatio: ratio,
          visualStyle: style,
          preferredLanguage: language,
          narrationPreference: narration,
          additionalInstructions: activeChips.join(", "),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "HF_UNCONFIGURED") {
          setIsHfMissing(true);
        }
        throw new Error(data.error || "Failed to generate visual plan.");
      }

      setGeneratedPlan(data.plan);
      setMasterPrompt(data.masterPrompt);
      setOriginalPrompt(data.masterPrompt);
      setModelUsed(data.modelUsed || "Hugging Face");

      if (typeof window !== "undefined") {
        localStorage.setItem("neura_topic", topic.trim());
        localStorage.setItem("neura_master_prompt", data.masterPrompt);
        localStorage.setItem("neura_plan", JSON.stringify(data.plan));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyPrompt = () => {
    if (!masterPrompt) return;
    navigator.clipboard.writeText(masterPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetPrompt = () => {
    setMasterPrompt(originalPrompt);
  };

  const handleProceedToPipeline = async () => {
    setIsProceeding(true);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("neura_topic", topic.trim());
        localStorage.setItem("neura_master_prompt", masterPrompt);
        if (generatedPlan) {
          localStorage.setItem("neura_plan", JSON.stringify(generatedPlan));
        }
      }

      await saveProject({
        title: generatedPlan?.title || topic.trim(),
        topic: topic.trim(),
        style,
        model: "HunyuanVideo",
        educationalPlan: generatedPlan,
        masterPrompt,
        jobStatus: "awaiting_video_provider",
      });

      router.push("/generate");
    } catch {
      router.push("/generate");
    } finally {
      setIsProceeding(false);
    }
  };

  const isPromptEdited = masterPrompt.trim() !== originalPrompt.trim();

  return (
    <div className="container mx-auto px-4 py-8 lg:py-12 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500 bg-background">
      {/* Aurora Background Ambient Glow */}
      <div className="aurora-bg" />

      <div className="mb-10 text-center relative z-10">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-foreground">
          AI Educational Visual Planner
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
          Powered by Hugging Face Inference. Enter any scientific or educational concept to generate a structured multi-scene lesson plan and Master Prompt.
        </p>
      </div>

      {/* Unconfigured HF Banner */}
      {isHfMissing && (
        <div className="mb-8 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 flex items-start gap-3.5 relative z-10">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-amber-300">
              Hugging Face API Token Not Configured
            </p>
            <p className="text-amber-200/90 text-xs leading-relaxed">
              To generate live educational plans, add <code className="bg-black/40 px-1.5 py-0.5 rounded text-amber-300 font-mono">HF_TOKEN</code> to your local <code className="bg-black/40 px-1.5 py-0.5 rounded text-amber-300 font-mono">.env.local</code> file. You can create a free User Access Token at{" "}
              <a
                href="https://huggingface.co/settings/tokens"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-white"
              >
                huggingface.co/settings/tokens
              </a>.
            </p>
          </div>
        </div>
      )}

      {/* General Error Banner */}
      {errorMessage && !isHfMissing && (
        <div className="mb-8 p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-3 relative z-10">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">{errorMessage}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-8 relative z-10">
        {/* LEFT: FORM INPUT */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
          <Card className="bg-card shadow-sm border-border">
            <CardContent className="p-6 md:p-8">
              <form onSubmit={handleGeneratePlan} className="space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <Label htmlFor="topic" className="text-base font-semibold text-foreground">
                      What educational concept do you want to explain?
                    </Label>
                    <span className={`text-xs font-mono transition-colors ${getCharColor()}`}>
                      {topic.length} / {MAX_CHARS}
                    </span>
                  </div>

                  <div
                    className={`relative rounded-xl border transition-all duration-300 ${
                      isFocused
                        ? "border-primary ring-1 ring-primary/20 shadow-[0_0_15px_rgba(15,164,175,0.2)]"
                        : "border-input bg-background/50 hover:border-border/80"
                    }`}
                  >
                    <Textarea
                      id="topic"
                      placeholder="e.g. Explain how the human heart pumps blood through the cardiac cycle..."
                      className="min-h-[150px] resize-none border-0 bg-transparent text-base focus-visible:ring-0 p-5"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value.slice(0, MAX_CHARS))}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      required
                    />
                  </div>

                  {/* Suggestion Chips */}
                  <div className="pt-2">
                    <div className="text-xs text-muted-foreground mb-3 font-medium">
                      Enhance prompt constraints (optional):
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {SUGGESTIONS.map((chip) => {
                        const isActive = activeChips.includes(chip.id);
                        return (
                          <button
                            key={chip.label}
                            type="button"
                            onClick={() => toggleChip(chip.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                              isActive
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:bg-primary/5"
                            }`}
                          >
                            {chip.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Configuration Options */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Style</Label>
                    <Select value={style} onValueChange={(v) => setStyle(v || "cinematic")}>
                      <SelectTrigger className="bg-background/50 border-input text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cinematic">3D Cinematic</SelectItem>
                        <SelectItem value="educational">Educational</SelectItem>
                        <SelectItem value="stylized">Stylized</SelectItem>
                        <SelectItem value="realistic">Realistic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Ratio</Label>
                    <Select value={ratio} onValueChange={(v) => setRatio(v || "16:9")}>
                      <SelectTrigger className="bg-background/50 border-input text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="16:9">16:9 Landscape</SelectItem>
                        <SelectItem value="9:16">9:16 Portrait</SelectItem>
                        <SelectItem value="1:1">1:1 Square</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Duration</Label>
                    <Select value={duration} onValueChange={(v) => setDuration(v || "10")}>
                      <SelectTrigger className="bg-background/50 border-input text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 seconds</SelectItem>
                        <SelectItem value="10">10 seconds</SelectItem>
                        <SelectItem value="15">15 seconds</SelectItem>
                        <SelectItem value="30">30 seconds</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Level</Label>
                    <Select value={audience} onValueChange={(v) => setAudience(v || "college")}>
                      <SelectTrigger className="bg-background/50 border-input text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kids">Kids</SelectItem>
                        <SelectItem value="middle_school">Middle School</SelectItem>
                        <SelectItem value="highschool">High School</SelectItem>
                        <SelectItem value="college">College</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Language</Label>
                    <Select value={language} onValueChange={(v) => setLanguage(v || "English")}>
                      <SelectTrigger className="bg-background/50 border-input text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="English">English</SelectItem>
                        <SelectItem value="Spanish">Spanish</SelectItem>
                        <SelectItem value="French">French</SelectItem>
                        <SelectItem value="German">German</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Narration</Label>
                    <Select value={narration} onValueChange={(v) => setNarration(v || "voiceover")}>
                      <SelectTrigger className="bg-background/50 border-input text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="voiceover">Voiceover</SelectItem>
                        <SelectItem value="subtitles_only">Subtitles Only</SelectItem>
                        <SelectItem value="visual_cues">Visual Cues</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={!topic.trim() || isGenerating}
                  className="w-full h-14 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Consulting Hugging Face AI Planning Engine...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      {generatedPlan ? "Re-Generate Visual Plan" : "Generate Educational Plan & Master Prompt"}
                    </>
                  )}
                  <div className="absolute inset-0 w-full h-full opacity-0 hover:opacity-100 transition-opacity duration-300">
                    <div className="neura-signal w-full h-full absolute top-0 left-0" />
                  </div>
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* AI-GENERATED PLAN & SCENE BREAKDOWN REVIEW */}
          {generatedPlan && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="bg-card border-primary/30 shadow-md">
                <CardHeader className="pb-3 border-b border-border">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-primary" />
                        <CardTitle className="text-lg font-bold text-foreground">
                          {generatedPlan.title}
                        </CardTitle>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Synthesized by {modelUsed} • {generatedPlan.scenes.length} Scenes
                      </p>
                    </div>
                    <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-xs">
                      Structured Plan Ready
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Educational Thesis
                    </h4>
                    <p className="text-sm text-foreground/90 leading-relaxed">
                      {generatedPlan.summary}
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">
                        Learning Objectives
                      </h4>
                      <ul className="text-xs text-foreground/80 space-y-1 list-disc list-inside">
                        {generatedPlan.learningObjectives.map((obj, i) => (
                          <li key={i}>{obj}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">
                        Key Concepts
                      </h4>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {generatedPlan.keyConcepts.map((kc, i) => (
                          <Badge key={i} variant="secondary" className="text-[11px] font-normal">
                            {kc}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Scene Breakdown */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Film className="w-4 h-4 text-primary" />
                    Scene-by-Scene Animation Breakdown
                  </h3>
                  <span className="text-xs text-muted-foreground font-mono">
                    Total: {duration}s
                  </span>
                </div>

                <div className="grid gap-3.5">
                  {generatedPlan.scenes.map((scene) => (
                    <Card key={scene.sceneNumber} className="bg-card/90 border-border hover:border-primary/40 transition-colors">
                      <CardContent className="p-4 space-y-2.5">
                        <div className="flex items-center justify-between border-b border-border/50 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">
                              {scene.sceneNumber}
                            </span>
                            <span className="text-sm font-semibold text-foreground">
                              {scene.title}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {scene.durationSeconds}s
                          </Badge>
                        </div>

                        <p className="text-xs text-foreground/90 leading-relaxed">
                          {scene.description}
                        </p>

                        <div className="grid sm:grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-1">
                          <div className="flex items-start gap-1.5">
                            <Camera className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                            <span><strong>Camera:</strong> {scene.cameraAngleAndMovement}</span>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                            <span><strong>Motion:</strong> {scene.animationActions}</span>
                          </div>
                        </div>

                        <div className="text-[11px] bg-background/50 p-2.5 rounded-lg border border-border/40 text-foreground/80 italic">
                          &ldquo;{scene.narration}&rdquo;
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Master Prompt Review & Edit Card */}
              <Card className="bg-card border-primary/40 shadow-lg">
                <CardHeader className="pb-3 border-b border-border">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <CardTitle className="text-base font-bold text-foreground">
                        Master Prompt (Editable for Video Model)
                      </CardTitle>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs ${isPromptEdited ? "border-amber-500/40 text-amber-400 bg-amber-500/10" : "border-primary/40 text-primary bg-primary/10"}`}>
                        {isPromptEdited ? "Customized by Creator" : "AI-Generated"}
                      </Badge>

                      {isPromptEdited && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleResetPrompt}
                          className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Reset
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyPrompt}
                        className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                      >
                        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copied ? "Copied" : "Copy"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <Textarea
                    value={masterPrompt}
                    onChange={(e) => setMasterPrompt(e.target.value)}
                    className="min-h-[160px] text-xs font-mono bg-background/80 border-input leading-relaxed resize-y focus-visible:ring-1 focus-visible:ring-primary"
                    placeholder="Master Prompt will appear here..."
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <p className="text-xs text-muted-foreground max-w-md">
                      Review or fine-tune this Master Prompt before dispatching to the video model generation pipeline.
                    </p>

                    <Button
                      onClick={handleProceedToPipeline}
                      disabled={isProceeding || !masterPrompt.trim()}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 h-11 shadow-md hover:-translate-y-0.5 transition-all gap-2"
                    >
                      {isProceeding ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving & Routing...
                        </>
                      ) : (
                        <>
                          Proceed to Pipeline
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* RIGHT: PIPELINE STEP PREVIEW & ASPECT RATIO */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
          {/* Active Pipeline visualization when focused */}
          <Card
            className={`border transition-all duration-500 overflow-hidden ${
              isFocused || isGenerating
                ? "bg-primary/5 border-primary/30 shadow-[0_0_20px_rgba(15,164,175,0.15)]"
                : "bg-card border-border"
            }`}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div
                  className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                    isGenerating
                      ? "bg-amber-400 animate-ping"
                      : isFocused
                      ? "bg-primary animate-pulse"
                      : "bg-muted-foreground"
                  }`}
                />
                <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                  {isGenerating
                    ? <span className="text-amber-400">Hugging Face Processing</span>
                    : isFocused
                    ? <span className="text-primary">Neura AI Listening</span>
                    : "Pipeline Status"}
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { label: "1. Topic Synthesis", active: focusAnimStep >= 0 || Boolean(generatedPlan) },
                  { label: "2. Scene Structure & Timing", active: focusAnimStep >= 1 || Boolean(generatedPlan) },
                  { label: "3. Visual & Camera Choreography", active: focusAnimStep >= 2 || Boolean(generatedPlan) },
                  { label: "4. Master Prompt Assembly", active: focusAnimStep >= 3 || Boolean(generatedPlan) },
                  { label: "5. Creator Review & Customization", active: Boolean(generatedPlan) },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                        step.active ? "bg-primary scale-125 shadow-[0_0_8px_rgba(15,164,175,0.8)]" : "bg-border"
                      }`}
                    />
                    <div
                      className={`text-sm transition-colors duration-500 ${
                        step.active ? "text-foreground font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Aspect Ratio Preview */}
          <Card className="bg-card border-border flex-1 flex flex-col overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border bg-background/50">
              <div className="text-xs font-semibold text-foreground uppercase tracking-widest flex items-center gap-2">
                <PlaySquare className="w-4 h-4 text-primary" />
                Viewport Simulation
              </div>
            </div>

            <CardContent className="p-6 flex-1 flex flex-col items-center justify-center bg-background/20 relative min-h-[250px]">
              <div
                className="absolute neura-grid-light inset-0 opacity-40 z-0"
                style={{ backgroundPosition: "center" }}
              />

              <div className="relative z-10 w-full flex items-center justify-center h-full">
                <div
                  className="border border-primary/20 bg-primary/5 rounded-lg shadow-sm flex flex-col items-center justify-center gap-2 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] relative overflow-hidden"
                  style={{
                    width: ratio === "16:9" ? "100%" : ratio === "9:16" ? "42%" : "65%",
                    aspectRatio: ratio === "16:9" ? "16/9" : ratio === "9:16" ? "9/16" : "1/1",
                    maxWidth: "280px",
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary/5 to-transparent animate-pulse opacity-50" />
                  <Badge variant="outline" className="bg-background/80 backdrop-blur-sm border-border text-xs relative z-10 font-mono">
                    {ratio}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest relative z-10">
                    {style}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
