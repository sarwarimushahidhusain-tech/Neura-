"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  AlertCircle,
  Copy,
  Check,
  RotateCcw,
  ArrowRight,
  Send,
  Film,
  BookOpen,
  Camera,
  Layers,
  Wand2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { EducationalPlan } from "@/types/ai";
import { saveProject } from "@/lib/projects";

const MAX_CHARS = 1000;

const EXAMPLE_CHIPS = [
  "Explore the Solar System",
  "Understand Newton's Laws",
  "Inside the Human Heart",
  "How Electricity Works",
];

const QUICK_INSERTS = [
  "Cinematic Lighting",
  "Slow Motion",
  "Anatomical Cutaway",
  "Ultra-Realistic",
  "Volumetric Fog",
  "Microscopic Zoom",
];

export default function CreatePage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("cinematic");
  const [ratio, setRatio] = useState("16:9");
  const [duration, setDuration] = useState("10");
  const [audience, setAudience] = useState("college");
  const [language] = useState("English");
  const [narration] = useState("voiceover");

  const [isGenerating, setIsGenerating] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // AI Planning & Prompt Review State
  const [generatedPlan, setGeneratedPlan] = useState<EducationalPlan | null>(null);
  const [masterPrompt, setMasterPrompt] = useState("");
  const [originalPrompt, setOriginalPrompt] = useState("");
  const [, setModelUsed] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOrMissing, setIsOrMissing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isProceeding, setIsProceeding] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const queryTopic = urlParams.get("topic");
      const savedTopic = localStorage.getItem("neura_topic");
      const initialTopic = queryTopic || savedTopic;
      if (initialTopic) {
        setTimeout(() => setTopic(initialTopic), 0);
        localStorage.removeItem("neura_topic");
      }
    }
  }, []);

  const getCharColor = () => {
    const pct = topic.length / MAX_CHARS;
    if (pct > 0.9) return "text-red-400";
    if (pct > 0.75) return "text-[#FF9B25]";
    return "text-[#9AA8BC]";
  };

  const handleGeneratePlan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!topic.trim() || isGenerating) return;

    setIsGenerating(true);
    setErrorMessage(null);
    setIsOrMissing(false);

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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "OR_UNCONFIGURED" || data.code === "HF_UNCONFIGURED") {
          setIsOrMissing(true);
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

  const handleQuickInsert = (text: string) => {
    setMasterPrompt((prev) => (prev ? `${prev}, ${text}` : text));
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
        // Clear any stale match data from previous runs
        localStorage.removeItem("neura_video_url");
        localStorage.removeItem("neura_library_video");
        localStorage.removeItem("neura_alternatives");
        localStorage.removeItem("neura_no_match");
        localStorage.removeItem("neura_generation_error_code");
      }

      await saveProject({
        title: generatedPlan?.title || topic.trim(),
        topic: topic.trim(),
        style,
        model: "library-first",
        educationalPlan: generatedPlan,
        masterPrompt,
        jobStatus: "preparing",
      });

      // Route to cinematic 60-second preparation sequence
      router.push("/prepare");
    } catch {
      router.push("/prepare");
    } finally {
      setIsProceeding(false);
    }
  };

  const isPromptEdited = masterPrompt.trim() !== originalPrompt.trim();

  return (
    <div className="min-h-screen bg-[#050810] text-[#F5F7FC] neura-grid pb-28 pt-8">
      {/* Background ambient lighting */}
      <div className="aurora-bg" aria-hidden="true" />

      <div className="container mx-auto px-4 md:px-8 max-w-6xl relative z-10">

        {/* TOP SECTION: If no plan yet, show centered composer */}
        {!generatedPlan && (
          <div className="max-w-3xl mx-auto text-center pt-8 mb-12">
            {/* Top Label */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#00D4E8]/30 bg-[#00D4E8]/5 px-3.5 py-1 text-[11px] text-[#00D4E8] font-mono uppercase tracking-widest mb-6 shadow-[0_0_15px_rgba(0,212,232,0.15)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D4E8] shadow-[0_0_8px_rgba(0,212,232,0.9)]" />
              <span>AI CINEMATIC WORKSTUDIO</span>
            </div>

            {/* Heading */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-5 text-[#F5F7FC]">
              What do you want to{" "}
              <span className="gradient-cyan-teal">learn today?</span>
            </h1>

            {/* Supporting description */}
            <p className="text-sm md:text-base text-[#9AA8BC] max-w-xl mx-auto leading-relaxed mb-10">
              Describe any concept and Neura will construct a scene-by-scene educational blueprint with cinematic video generation.
            </p>

            {/* Error notifications if any */}
            {isOrMissing && (
              <div className="mb-8 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 flex items-start gap-3.5 text-left">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-amber-300">
                    OpenRouter API Key Not Configured
                  </p>
                  <p className="text-amber-200/90 leading-relaxed">
                    Neura uses OpenRouter for generating structured lesson plans and video master prompts. Add <code className="bg-black/40 px-1 py-0.5 rounded text-amber-300 font-mono">OPENROUTER_API_KEY</code> to your local <code className="bg-black/40 px-1 py-0.5 rounded text-amber-300 font-mono">.env.local</code> file. Free models are available at{" "}
                    <a
                      href="https://openrouter.ai/keys"
                      target="_blank"
                      rel="noreferrer"
                      className="underline text-amber-300 hover:text-white"
                    >
                      openrouter.ai/keys
                    </a>.
                  </p>
                </div>
              </div>
            )}

            {errorMessage && !isOrMissing && (
              <div className="mb-8 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 flex items-center gap-3 text-left">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-xs">{errorMessage}</p>
              </div>
            )}

            {/* Interactive Prompt Composer */}
            <form onSubmit={handleGeneratePlan} className="text-left">
              <div
                className={`relative rounded-2xl border bg-[#0B101C]/90 backdrop-blur-xl p-6 transition-all duration-300 shadow-[0_4px_30px_rgba(0,0,0,0.5)] ${
                  isFocused
                    ? "border-[#00D4E8] shadow-[0_0_35px_rgba(0,212,232,0.2)]"
                    : "border-[#1B2635] hover:border-[#2D3F55]"
                }`}
              >
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#9AA8BC]">
                    PROMPT COMPOSER
                  </span>
                  <span className={`text-[10px] font-mono transition-colors ${getCharColor()}`}>
                    {topic.length} / {MAX_CHARS}
                  </span>
                </div>

                <Textarea
                  id="topic"
                  placeholder="e.g. DNA replication inside a living cell with helicase unzipping the double helix..."
                  className="min-h-[140px] resize-none border-0 bg-transparent text-[#F5F7FC] placeholder:text-[#9AA8BC]/50 text-sm md:text-base focus-visible:ring-0 p-0 leading-relaxed"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value.slice(0, MAX_CHARS))}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handleGeneratePlan();
                    }
                  }}
                  required
                />

                {/* Example Topic Chips matching Screenshot 10 */}
                <div className="pt-4 border-t border-[#1B2635] mt-4">
                  <div className="text-[10px] font-mono text-[#9AA8BC] mb-2 uppercase tracking-wide">
                    EXAMPLE CONCEPTS:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {EXAMPLE_CHIPS.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setTopic(chip)}
                        className="px-3 py-1 rounded-full text-xs font-mono bg-[#101625] text-[#9AA8BC] border border-[#1B2635] hover:border-[#00D4E8]/40 hover:text-[#00D4E8] hover:bg-[#00D4E8]/5 transition-all duration-200"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Parameters Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#1B2635] mt-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-[#9AA8BC] uppercase">Style</span>
                    <Select value={style} onValueChange={(v) => setStyle(v || "cinematic")}>
                      <SelectTrigger className="bg-[#101625] border-[#1B2635] text-xs h-9 rounded-lg text-[#F5F7FC]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0B101C] border-[#1B2635] text-xs text-[#F5F7FC]">
                        <SelectItem value="cinematic">3D Cinematic</SelectItem>
                        <SelectItem value="educational">Educational</SelectItem>
                        <SelectItem value="stylized">Stylized</SelectItem>
                        <SelectItem value="realistic">Realistic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-[#9AA8BC] uppercase">Ratio</span>
                    <Select value={ratio} onValueChange={(v) => setRatio(v || "16:9")}>
                      <SelectTrigger className="bg-[#101625] border-[#1B2635] text-xs h-9 rounded-lg text-[#F5F7FC]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0B101C] border-[#1B2635] text-xs text-[#F5F7FC]">
                        <SelectItem value="16:9">16:9 Landscape</SelectItem>
                        <SelectItem value="9:16">9:16 Portrait</SelectItem>
                        <SelectItem value="1:1">1:1 Square</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-[#9AA8BC] uppercase">Duration</span>
                    <Select value={duration} onValueChange={(v) => setDuration(v || "10")}>
                      <SelectTrigger className="bg-[#101625] border-[#1B2635] text-xs h-9 rounded-lg text-[#F5F7FC]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0B101C] border-[#1B2635] text-xs text-[#F5F7FC]">
                        <SelectItem value="5">5 seconds</SelectItem>
                        <SelectItem value="10">10 seconds</SelectItem>
                        <SelectItem value="15">15 seconds</SelectItem>
                        <SelectItem value="30">30 seconds</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-[#9AA8BC] uppercase">Audience</span>
                    <Select value={audience} onValueChange={(v) => setAudience(v || "college")}>
                      <SelectTrigger className="bg-[#101625] border-[#1B2635] text-xs h-9 rounded-lg text-[#F5F7FC]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0B101C] border-[#1B2635] text-xs text-[#F5F7FC]">
                        <SelectItem value="kids">Elementary</SelectItem>
                        <SelectItem value="middle_school">Middle School</SelectItem>
                        <SelectItem value="highschool">High School</SelectItem>
                        <SelectItem value="college">College</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-5 mt-4 flex items-center justify-between">
                  <span className="text-[11px] text-[#9AA8BC] font-mono hidden sm:inline">
                    Press <kbd className="bg-[#101625] border border-[#1B2635] px-1.5 py-0.5 rounded text-[10px]">Ctrl+Enter</kbd> to submit
                  </span>

                  <Button
                    type="submit"
                    disabled={!topic.trim() || isGenerating}
                    className="ml-auto bg-gradient-to-r from-[#00D4E8] to-[#00C9B7] hover:opacity-95 text-[#050810] font-bold text-xs px-6 h-11 rounded-full shadow-[0_0_20px_rgba(0,212,232,0.35)] transition-all duration-200 gap-2 flex items-center"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Synthesizing Blueprint...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Create Video
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* MASTER PROMPT REVIEW & BLUEPRINT SECTION matching Screenshots 11 & 12 */}
        {generatedPlan && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#1B2635]">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#00D4E8]/30 bg-[#00D4E8]/5 px-3 py-1 text-[10px] text-[#00D4E8] font-mono uppercase tracking-widest mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00D4E8]" />
                  <span>PHASE 02 // HUMAN-IN-THE-LOOP OVERSIGHT</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F5F7FC]">
                  Review Master Prompt
                </h2>
                <p className="text-sm text-[#9AA8BC] mt-1">
                  The AI models will follow the reviewed prompt. You can edit it before generation.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setGeneratedPlan(null)}
                  className="border-[#1B2635] bg-[#0B101C] text-xs text-[#9AA8BC] hover:text-[#F5F7FC] hover:border-[#2D3F55]"
                >
                  Edit Concept
                </Button>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid lg:grid-cols-12 gap-8">

              {/* Left Column: AI Blueprint Plan */}
              <div className="lg:col-span-6 space-y-6">
                <div className="rounded-2xl border border-[#1B2635] bg-[#0B101C]/90 backdrop-blur-md p-6 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1B2635]">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#00D4E8]" />
                      <h3 className="font-bold text-base text-[#F5F7FC]">{generatedPlan.title}</h3>
                    </div>
                    <Badge variant="outline" className="border-[#00D4E8]/40 bg-[#00D4E8]/10 text-[#00D4E8] text-[10px] font-mono">
                      {generatedPlan.scenes.length} Scenes · {duration}s
                    </Badge>
                  </div>

                  <p className="text-xs text-[#9AA8BC] leading-relaxed mb-5">
                    {generatedPlan.summary}
                  </p>

                  <div className="grid grid-cols-2 gap-3 mb-5 p-3 rounded-xl bg-[#050810] border border-[#1B2635] text-xs font-mono">
                    <div>
                      <span className="text-[#9AA8BC] text-[10px] block">STYLE</span>
                      <span className="text-[#00D4E8] font-medium capitalize">{style}</span>
                    </div>
                    <div>
                      <span className="text-[#9AA8BC] text-[10px] block">ASPECT RATIO</span>
                      <span className="text-[#F5F7FC] font-medium">{ratio}</span>
                    </div>
                    <div>
                      <span className="text-[#9AA8BC] text-[10px] block">AUDIENCE</span>
                      <span className="text-[#9565F5] font-medium capitalize">{audience}</span>
                    </div>
                    <div>
                      <span className="text-[#9AA8BC] text-[10px] block">MODEL</span>
                      <span className="text-[#00C9B7] font-medium">LTX 2.5 Lite</span>
                    </div>
                  </div>

                  {/* Scene-by-Scene Breakdown */}
                  <div className="space-y-3">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-[#9AA8BC] flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-[#00D4E8]" />
                      SCENE BREAKDOWN
                    </div>

                    {generatedPlan.scenes.map((scene) => (
                      <div
                        key={scene.sceneNumber}
                        className="p-3.5 rounded-xl border border-[#1B2635] bg-[#050810]/70 space-y-2 hover:border-[#00D4E8]/30 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#00D4E8]">
                            Scene {scene.sceneNumber}: {scene.title}
                          </span>
                          <span className="text-[10px] font-mono text-[#9AA8BC]">
                            {scene.durationSeconds}s
                          </span>
                        </div>
                        <p className="text-xs text-[#F5F7FC]/80 leading-relaxed">
                          {scene.description}
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-[10px] text-[#9AA8BC] pt-1">
                          <div className="flex items-center gap-1">
                            <Camera className="w-3 h-3 text-[#00D4E8]" />
                            <span className="truncate">{scene.cameraAngleAndMovement}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Layers className="w-3 h-3 text-[#9565F5]" />
                            <span className="truncate">{scene.animationActions}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Master Prompt Editor matching Screenshot 12 */}
              <div className="lg:col-span-6 space-y-6">
                <div className="rounded-2xl border border-[#00D4E8]/30 bg-[#0B101C]/90 backdrop-blur-md p-6 shadow-[0_4px_30px_rgba(0,0,0,0.5)] flex flex-col justify-between">
                  <div>
                    {/* Header bar of editor */}
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1B2635]">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#00D4E8] shadow-[0_0_8px_rgba(0,212,232,0.8)]" />
                        <span className="text-xs font-mono font-bold text-[#F5F7FC]">master-prompt.txt</span>
                        {isPromptEdited && (
                          <span className="text-[9px] font-mono text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                            MODIFIED
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-[#9AA8BC]">
                          {masterPrompt.length} chars
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyPrompt}
                          className="h-7 px-2 text-xs text-[#9AA8BC] hover:text-[#F5F7FC]"
                          title="Copy Prompt"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-[#00C9B7]" /> : <Copy className="w-3.5 h-3.5" />}
                        </Button>
                        {isPromptEdited && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleResetPrompt}
                            className="h-7 px-2 text-xs text-[#9AA8BC] hover:text-[#F5F7FC]"
                            title="Reset to Original"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Quick Insert Chips */}
                    <div className="mb-4">
                      <div className="text-[10px] font-mono text-[#9AA8BC] uppercase mb-2 flex items-center gap-1">
                        <Wand2 className="w-3 h-3 text-[#00D4E8]" />
                        QUICK MODIFIERS:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_INSERTS.map((insert) => (
                          <button
                            key={insert}
                            type="button"
                            onClick={() => handleQuickInsert(insert)}
                            className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-[#101625] text-[#9AA8BC] border border-[#1B2635] hover:border-[#00D4E8]/40 hover:text-[#00D4E8] transition-colors"
                          >
                            + {insert}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Editable Prompt Area */}
                    <div className="rounded-xl border border-[#1B2635] bg-[#050810] p-4 font-mono text-xs text-[#F5F7FC] leading-relaxed shadow-inner">
                      <Textarea
                        value={masterPrompt}
                        onChange={(e) => setMasterPrompt(e.target.value)}
                        className="min-h-[220px] bg-transparent border-0 p-0 text-xs font-mono text-[#F5F7FC] focus-visible:ring-0 leading-relaxed resize-none"
                      />
                    </div>
                  </div>

                  {/* Cost & Verification Footer */}
                  <div className="pt-6 mt-6 border-t border-[#1B2635] space-y-4">
                    <div className="flex items-center justify-between text-xs text-[#9AA8BC] font-mono">
                      <span>Engine: Pixazo LTX 2.5 Lite</span>
                      <span>Estimated Duration: {duration}s</span>
                    </div>

                    <Button
                      onClick={handleProceedToPipeline}
                      disabled={isProceeding}
                      className="w-full bg-gradient-to-r from-[#00D4E8] to-[#00C9B7] hover:opacity-95 text-[#050810] font-bold text-sm h-12 rounded-full shadow-[0_0_25px_rgba(0,212,232,0.4)] transition-all duration-200 gap-2 flex items-center justify-center"
                    >
                      {isProceeding ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Preparing Generation Job...
                        </>
                      ) : (
                        <>
                          Approve &amp; Generate <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
