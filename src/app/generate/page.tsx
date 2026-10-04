"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Loader2,
  Sparkles,
  Copy,
  RefreshCw,
  Play,
  Trophy,
  Check,
  ArrowRight,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type Stage = "planning" | "reviewing" | "generating" | "evaluating" | "complete";

const DEFAULT_PROMPT =
  "Create a scientifically accurate cinematic 3D medical visualization of the human heart. Show the complete anatomical heart with realistic cardiac tissue and clearly visible chambers and major blood vessels. Transition into a semi-transparent cutaway view revealing the right atrium, left atrium, right ventricle, left ventricle, and major valves. Visualize oxygen-poor blood entering the right side of the heart and oxygen-rich blood leaving the left ventricle through the aorta. Use smooth camera movement, realistic lighting, scientifically grounded anatomy, clean educational presentation, and consistent anatomical structure throughout the video. Dark blue scientific background, high visual clarity, no text overlays, no subtitles, no watermark.";

const PREP_STEPS = [
  "Understanding your topic",
  "Creating scene plan",
  "Building Master Prompt",
];

const MODEL_SPEEDS: Record<"LTX" | "HunyuanVideo" | "CogVideoX", number> = {
  LTX: 1.5,
  HunyuanVideo: 1.2,
  CogVideoX: 0.8,
};

const MOCK_SCORES: Record<"LTX" | "HunyuanVideo" | "CogVideoX", number> = {
  LTX: 84,
  HunyuanVideo: 91,
  CogVideoX: 79,
};

// Colors based on instruction
const MODEL_COLORS: Record<"LTX" | "HunyuanVideo" | "CogVideoX", string> = {
  LTX: "bg-[#2563EB] text-white", // Electric blue
  HunyuanVideo: "bg-[#7C3AED] text-white", // Violet
  CogVideoX: "bg-[#4F46E5] text-white", // Indigo
};
const MODEL_BARS: Record<"LTX" | "HunyuanVideo" | "CogVideoX", string> = {
  LTX: "bg-[#2563EB]",
  HunyuanVideo: "bg-[#7C3AED]",
  CogVideoX: "bg-[#4F46E5]",
};

export default function GeneratePage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("planning");
  const [prepProgress, setPrepProgress] = useState(0);
  const [ltxProg, setLtxProg] = useState(0);
  const [hunyuanProg, setHunyuanProg] = useState(0);
  const [cogProg, setCogProg] = useState(0);
  const [topic, setTopic] = useState("How the Human Heart Pumps Blood");
  const [masterPrompt, setMasterPrompt] = useState(DEFAULT_PROMPT);
  const [originalPrompt] = useState(DEFAULT_PROMPT);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [animatedScores, setAnimatedScores] = useState({ LTX: 0, HunyuanVideo: 0, CogVideoX: 0 });
  const allDone = ltxProg >= 100 && hunyuanProg >= 100 && cogProg >= 100;
  const scoreAnimRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("neura_topic");
      if (saved) setTimeout(() => setTopic(saved), 0);
    }
  }, []);

  useEffect(() => {
    if (stage !== "planning") return;
    const timer = setInterval(() => {
      setPrepProgress((p) => {
        if (p >= 100) { clearInterval(timer); return 100; }
        return p + 2;
      });
    }, 50);
    return () => clearInterval(timer);
  }, [stage]);

  useEffect(() => {
    if (stage !== "generating") return;
    const t1 = setInterval(() => setLtxProg((p) => Math.min(p + MODEL_SPEEDS.LTX, 100)), 80);
    const t2 = setInterval(() => setHunyuanProg((p) => Math.min(p + MODEL_SPEEDS.HunyuanVideo, 100)), 80);
    const t3 = setInterval(() => setCogProg((p) => Math.min(p + MODEL_SPEEDS.CogVideoX, 100)), 80);
    return () => { clearInterval(t1); clearInterval(t2); clearInterval(t3); };
  }, [stage]);

  useEffect(() => {
    if (stage === "generating" && allDone) {
      setTimeout(() => setStage("evaluating"), 300);
    }
  }, [stage, allDone]);

  useEffect(() => {
    if (stage === "evaluating") {
      setTimeout(() => setStage("complete"), 2000);
    }
  }, [stage]);

  useEffect(() => {
    if (stage !== "complete" || scoreAnimRef.current) return;
    scoreAnimRef.current = true;
    const duration = 1200;
    const step = 16;
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += step;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setAnimatedScores({
        LTX: Math.round(MOCK_SCORES.LTX * ease),
        HunyuanVideo: Math.round(MOCK_SCORES.HunyuanVideo * ease),
        CogVideoX: Math.round(MOCK_SCORES.CogVideoX * ease),
      });
      if (t >= 1) clearInterval(interval);
    }, step);
    return () => clearInterval(interval);
  }, [stage]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(masterPrompt).then(() => {
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    });
  }, [masterPrompt]);

  const handleSave = useCallback(() => {
    setSaveState("saving");
    setTimeout(() => {
      setSaveState("saved");
      setHasUnsaved(false);
      setTimeout(() => setSaveState("idle"), 2000);
    }, 700);
  }, []);

  const handlePromptChange = (val: string) => {
    setMasterPrompt(val);
    setHasUnsaved(val !== originalPrompt);
    setSaveState("idle");
  };

  const handleResetPrompt = () => {
    setMasterPrompt(originalPrompt);
    setHasUnsaved(false);
    setSaveState("idle");
  };

  const prepStageIdx = Math.floor(prepProgress / (100 / PREP_STEPS.length));

  return (
    <div className="dark-cinematic min-h-[calc(100vh-64px)] w-full bg-background text-foreground flex flex-col relative overflow-hidden transition-colors duration-1000">
      
      {/* Background elements */}
      <div className="absolute inset-0 neura-grid-dark opacity-10 pointer-events-none" />
      <div className="aurora-bg" />

      {/* ─── PLANNING ─── */}
      {stage === "planning" && (
        <div className="container mx-auto px-4 py-16 max-w-2xl flex flex-col items-center text-center relative z-10 flex-1 justify-center">
          <div className="mb-2 inline-flex items-center gap-2 text-xs text-muted-foreground font-mono bg-white/5 border border-white/10 px-3 py-1 rounded-full animate-pulse">
            Simulation Preview
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3 mt-4 text-foreground">
            Processing Idea
          </h1>
          <p className="text-muted-foreground mb-10 text-lg">
            Neura is structuring your topic into a visual blueprint.
          </p>

          <Card className="w-full bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl">
            <CardContent className="p-8 space-y-8 text-left">
              {PREP_STEPS.map((label, i) => {
                const done = prepProgress >= ((i + 1) / PREP_STEPS.length) * 100;
                const active = prepStageIdx === i && !done;
                const barVal = done
                  ? 100
                  : active
                  ? ((prepProgress % (100 / PREP_STEPS.length)) / (100 / PREP_STEPS.length)) * 100
                  : 0;
                return (
                  <div key={label} className="space-y-2.5">
                    <div className="flex justify-between items-center text-sm">
                      <span
                        className={`flex items-center gap-3 font-medium transition-colors duration-300 ${
                          done || active ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {done ? (
                          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                          </div>
                        ) : active ? (
                          <div className="w-5 h-5 rounded-full border border-primary flex items-center justify-center flex-shrink-0 relative">
                            <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-50" />
                          </div>
                        ) : (
                          <span className="w-5 h-5 flex-shrink-0 rounded-full border border-white/20" />
                        )}
                        <span className={active ? "text-foreground" : ""}>{label}</span>
                      </span>
                      <span className="text-muted-foreground text-xs font-mono">
                        {done ? "100%" : active ? `${Math.floor(barVal)}%` : "0%"}
                      </span>
                    </div>
                    <Progress value={barVal} className="h-1 bg-white/5" />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div
            className={`mt-12 transition-all duration-500 ${
              prepProgress >= 100 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"
            }`}
          >
            <p className="text-sm text-[#0EA5A4] mb-5 flex items-center gap-2 justify-center font-medium">
              <CheckCircle2 className="h-4 w-4" /> Planning complete
            </p>
            <Button
              size="lg"
              onClick={() => setStage("reviewing")}
              className="bg-primary hover:bg-primary/90 active:scale-95 text-primary-foreground transition-all duration-200 h-12 px-8"
            >
              Review Master Prompt <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ─── REVIEW / EDIT MASTER PROMPT ─── */}
      {stage === "reviewing" && (
        <div className="container mx-auto px-4 py-8 max-w-6xl relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2 text-foreground">
              Review Master Prompt
            </h1>
            <p className="text-muted-foreground">
              The AI will strictly follow this version. Modify it as needed.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* AI Plan Sidebar */}
            <div className="lg:col-span-1">
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 h-full">
                <CardHeader className="border-b border-white/10 pb-4">
                  <CardTitle className="text-base flex items-center gap-2 text-foreground">
                    <Sparkles className="w-4 h-4 text-primary" />
                    AI Plan
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-6 text-sm">
                  <div>
                    <div className="text-muted-foreground text-xs mb-1 font-mono uppercase">Topic</div>
                    <div className="font-medium text-foreground">{topic}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      ["Style", "Cinematic 3D"],
                      ["Ratio", "16:9"],
                      ["Duration", "10 sec"],
                      ["Audience", "College"],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <div className="text-muted-foreground text-xs mb-0.5 font-mono uppercase">{k}</div>
                        <div className="font-medium text-foreground">{v}</div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs mb-3 font-mono uppercase">Scene Plan</div>
                    <ol className="space-y-3 relative pl-6 before:absolute before:left-[11px] before:inset-y-0 before:w-px before:bg-white/10">
                      {[
                        "Show complete external heart.",
                        "Reveal chambers and major valves.",
                        "Visualize oxygen-poor blood on right.",
                        "Visualize oxygen-rich blood leaving aorta.",
                      ].map((s, i) => (
                        <li key={i} className="relative text-foreground/90">
                          <div className="absolute -left-6 top-0 h-6 w-6 rounded-full bg-black/60 border border-primary/40 flex items-center justify-center text-[10px] text-primary">
                            {i + 1}
                          </div>
                          {s}
                        </li>
                      ))}
                    </ol>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Prompt Editor */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <Card className="flex-1 bg-[#EEF4FF] dark-cinematic:bg-[#EEF4FF] border-white/10 shadow-lg flex flex-col overflow-hidden text-slate-900">
                {/* Custom light editor surface within the dark page */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white gap-3">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-500 font-mono">
                      {masterPrompt.length} chars
                    </span>
                    {hasUnsaved && (
                      <span className="text-amber-600 flex items-center gap-1 animate-in fade-in duration-300">
                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                        Unsaved changes
                      </span>
                    )}
                    {saveState === "saved" && !hasUnsaved && (
                      <span className="text-emerald-600 flex items-center gap-1 animate-in fade-in duration-300">
                        <Check className="h-3 w-3" /> Saved
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      onClick={handleCopy}
                    >
                      {copyState === "copied" ? (
                        <><Check className="mr-1 h-3 w-3 text-emerald-600" />Copied</>
                      ) : (
                        <><Copy className="mr-1 h-3 w-3" />Copy</>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      onClick={handleResetPrompt}
                    >
                      <RefreshCw className="mr-1 h-3 w-3" />Reset
                    </Button>
                    {hasUnsaved && (
                      <Button
                        size="sm"
                        className="h-8 px-3 text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-200"
                        onClick={handleSave}
                      >
                        {saveState === "saving" ? "Saving…" : "Save changes"}
                      </Button>
                    )}
                  </div>
                </div>

                <CardContent className="p-0 flex-1 flex flex-col bg-white">
                  <Textarea
                    aria-label="Master prompt editor"
                    className="flex-1 min-h-[340px] resize-none bg-transparent border-0 text-base p-6 focus-visible:ring-0 leading-relaxed font-mono text-slate-800"
                    value={masterPrompt}
                    onChange={(e) => handlePromptChange(e.target.value)}
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end mt-2">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground h-14 px-8 text-base shadow-lg transition-all duration-200 hover:-translate-y-0.5 group relative overflow-hidden"
                  onClick={() => setStage("generating")}
                >
                  <div className="absolute inset-0 neura-signal opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Play className="w-4 h-4 mr-2" /> Approve & Generate
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── GENERATING / EVALUATING / COMPLETE ─── */}
      {(stage === "generating" || stage === "evaluating" || stage === "complete") && (
        <div className="container mx-auto px-4 py-16 max-w-5xl flex flex-col items-center relative z-10 flex-1 justify-center animate-in fade-in duration-700">
          <div className="mb-4 inline-flex items-center gap-2 text-xs text-muted-foreground font-mono bg-white/5 border border-white/10 px-3 py-1 rounded-full">
            Simulation Preview
          </div>

          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-center text-foreground">
            {stage === "generating" && "Generating Videos"}
            {stage === "evaluating" && "Evaluating Results…"}
            {stage === "complete" && "Best Result Selected"}
          </h1>
          <p className="text-muted-foreground mb-12 text-center text-lg max-w-xl">
            {stage === "generating"
              ? "Parallel generation across multiple AI video models."
              : stage === "evaluating"
              ? "Comparing outputs for visual quality, accuracy, and motion."
              : "Neura evaluated all models and selected the most cinematic and accurate result."}
          </p>

          <div className="grid md:grid-cols-3 gap-6 w-full mb-12">
            {(["LTX", "HunyuanVideo", "CogVideoX"] as const).map((model) => {
              const prog = { LTX: ltxProg, HunyuanVideo: hunyuanProg, CogVideoX: cogProg }[model];
              const done = prog >= 100;
              const isBest = model === "HunyuanVideo" && stage === "complete";
              const badgeColor = MODEL_COLORS[model];
              const barColor = MODEL_BARS[model];

              return (
                <Card
                  key={model}
                  className={`transition-all duration-700 overflow-hidden relative ${
                    isBest
                      ? "border-[#7C3AED] bg-black/60 shadow-[0_0_40px_rgba(124,58,237,0.3)] scale-105 z-10"
                      : "bg-black/40 border-white/10"
                  }`}
                >
                  {isBest && (
                    <div className="absolute inset-0 bg-gradient-to-b from-[#7C3AED]/10 to-transparent pointer-events-none" />
                  )}

                  <CardHeader className="pb-2 pt-5 px-6 relative z-10">
                    <CardTitle className="text-base flex justify-between items-center text-foreground">
                      <span>{model}</span>
                      {stage === "complete" ? (
                        isBest ? (
                          <Badge className="bg-[#7C3AED] text-white border-0 text-xs shadow-md">
                            <Trophy className="h-3 w-3 mr-1" />Best Result
                          </Badge>
                        ) : (
                          <Badge className="bg-[#0EA5A4]/20 text-[#0EA5A4] border-0 text-xs">
                            Done
                          </Badge>
                        )
                      ) : done ? (
                        <Badge className="bg-[#0EA5A4]/20 text-[#0EA5A4] border-0 text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />Done
                        </Badge>
                      ) : (
                        <Badge className={`${badgeColor} border-0 text-xs shadow-sm`}>
                          {prog > 0 ? "Generating" : "Queued"}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-6 pb-6 space-y-5 relative z-10">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground font-mono">
                        <span>Progress</span>
                        <span>{Math.floor(prog)}%</span>
                      </div>
                      {/* Custom progress bar to support different colors */}
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-full transition-all duration-300 ease-out ${barColor}`}
                          style={{ width: `${prog}%` }}
                        />
                      </div>
                    </div>

                    {stage === "complete" && (
                      <div className="pt-2 animate-in fade-in slide-in-from-bottom-2 duration-700">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1.5 font-mono">
                          <span>Evaluation Score</span>
                          <span className={`font-bold text-sm ${isBest ? "text-[#7C3AED]" : "text-foreground"}`}>
                            {animatedScores[model]}<span className="text-muted-foreground text-xs font-normal">/100</span>
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className={`h-full transition-all duration-300 ease-out ${isBest ? "bg-[#7C3AED]" : "bg-white/30"}`}
                            style={{ width: `${animatedScores[model]}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {stage === "evaluating" && (
            <div className="flex flex-col items-center gap-3 text-foreground mb-8 animate-in fade-in duration-500">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
              <div className="text-sm font-medium tracking-wide uppercase text-primary">Running Analysis</div>
            </div>
          )}

          <div
            className={`transition-all duration-1000 ${
              stage === "complete" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none absolute"
            }`}
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-3 text-foreground">
                <Trophy className="h-6 w-6 text-[#7C3AED]" />
                HunyuanVideo Selected
              </h2>
              <p className="text-muted-foreground">Score 91/100 · 3D Cinematic · 16:9</p>
            </div>
            <Button
              size="lg"
              onClick={() => router.push("/result")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground h-14 px-10 text-lg shadow-[0_0_30px_rgba(79,70,229,0.4)] hover:shadow-[0_0_40px_rgba(79,70,229,0.6)] transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group"
            >
              <div className="absolute inset-0 neura-signal opacity-100" />
              View Final Video
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
