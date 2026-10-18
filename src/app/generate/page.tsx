"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Check,
  ArrowRight,
  AlertCircle,
  ExternalLink,
  Film,
  Zap,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type Stage = "planning" | "reviewing" | "generating" | "complete";

const DEFAULT_PROMPT =
  "Create a scientifically accurate cinematic 3D medical visualization of the human heart. Show the complete anatomical heart with realistic cardiac tissue and clearly visible chambers and major blood vessels. Transition into a semi-transparent cutaway view revealing the right atrium, left atrium, right ventricle, left ventricle, and major valves. Visualize oxygen-poor blood entering the right side of the heart and oxygen-rich blood leaving the left ventricle through the aorta. Use smooth camera movement, realistic lighting, scientifically grounded anatomy, clean educational presentation, and consistent anatomical structure throughout the video. Dark blue scientific background, high visual clarity, no text overlays, no subtitles, no watermark.";

const PREP_STEPS = [
  "Structuring educational plan with Qwen",
  "Choreographing camera & 3D lighting",
  "Assembling Master Video Prompt for LTX",
];

const VIDEO_MODELS = [
  {
    id: "Lightricks/LTX-2.5",
    name: "Hugging Face LTX 2.5",
    badge: "Official HF Model Hub",
    provider: "huggingface",
    cost: "HF Model Hub",
    description: "Official Lightricks LTX 2.5 high-definition 3D video generation model on Hugging Face",
    isRecommended: true,
  },
  {
    id: "Lightricks/ltx-video-distilled",
    name: "Hugging Face LTX Lite (Distilled)",
    badge: "HF Fast Distilled",
    provider: "huggingface",
    cost: "HF Model Hub",
    description: "Lightweight distilled LTX 2.5 3D video model on Hugging Face for accelerated generation",
    isRecommended: false,
  },
  {
    id: "ltx-2-5-lite",
    name: "Pixazo LTX 2.5 Lite",
    badge: "Realtime 3D Engine",
    provider: "pixazo",
    cost: "$0.45 (5s @ 720p)",
    description: "Ultra-fast, lightweight 3D cinematic video generation powered by Pixazo Gateway",
    isRecommended: false,
  },
  {
    id: "Wan-AI/Wan2.1-T2V-1.3B",
    name: "Wan 2.1 (1.3B)",
    badge: "Hugging Face Inference",
    provider: "huggingface",
    cost: "HF Serverless Credits",
    description: "Open-source diffusion model on Hugging Face router",
    isRecommended: false,
  },
  {
    id: "tencent/HunyuanVideo",
    name: "HunyuanVideo",
    badge: "Cinematic High Res",
    provider: "huggingface",
    cost: "HF Serverless Credits",
    description: "High parameter text-to-video diffusion model",
    isRecommended: false,
  },
];

export default function GeneratePage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("planning");
  const [prepProgress, setPrepProgress] = useState(0);
  const [topic, setTopic] = useState("How the Human Heart Pumps Blood");
  const [masterPrompt, setMasterPrompt] = useState(DEFAULT_PROMPT);
  const [originalPrompt] = useState(DEFAULT_PROMPT);
  const [selectedModel, setSelectedModel] = useState("Lightricks/LTX-2.5");
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [hasUnsaved, setHasUnsaved] = useState(false);

  // Generation & Asynchronous Polling State
  const [isCallingApi, setIsCallingApi] = useState(false);
  const [jobProgress, setJobProgress] = useState(20);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationErrorCode, setGenerationErrorCode] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("neura_topic");
      if (saved) setTimeout(() => setTopic(saved), 0);
      const savedPrompt = localStorage.getItem("neura_master_prompt");
      if (savedPrompt) setTimeout(() => setMasterPrompt(savedPrompt), 0);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  useEffect(() => {
    if (stage !== "planning") return;
    const timer = setInterval(() => {
      setPrepProgress((p) => {
        if (p >= 100) {
          clearInterval(timer);
          return 100;
        }
        return p + 4;
      });
    }, 40);
    return () => clearInterval(timer);
  }, [stage]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(masterPrompt).then(() => {
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    });
  }, [masterPrompt]);

  const handleSave = useCallback(() => {
    setSaveState("saving");
    if (typeof window !== "undefined") {
      localStorage.setItem("neura_master_prompt", masterPrompt);
    }
    setTimeout(() => {
      setSaveState("saved");
      setHasUnsaved(false);
      setTimeout(() => setSaveState("idle"), 2000);
    }, 500);
  }, [masterPrompt]);

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

  const activeModelObj =
    VIDEO_MODELS.find((m) => m.id === selectedModel) || VIDEO_MODELS[0];

  // Start polling an in-flight asynchronous generation job
  const pollJobStatus = (jobId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    let attempts = 0;
    const maxAttempts = 40; // 40 * 3s = 120s timeout limit

    pollingRef.current = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/video/status/${jobId}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setIsCallingApi(false);
          setGenerationError(data.error || "Failed to retrieve job status.");
          setGenerationErrorCode(data.code || "STATUS_CHECK_FAILED");
          return;
        }

        const job = data.job;

        if (job.status === "completed") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setIsCallingApi(false);
          if (job.videoUrl && typeof window !== "undefined") {
            localStorage.setItem("neura_video_url", job.videoUrl);
          }
          setStage("complete");
        } else if (job.status === "failed") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setIsCallingApi(false);
          setGenerationError(job.error || "Video generation failed on provider.");
          setGenerationErrorCode(job.errorCode || "GENERATION_FAILED");
        } else {
          // Job still queued or processing
          setJobProgress(job.progressPercent || Math.min(30 + attempts * 2, 90));
        }
      } catch (err: unknown) {
        if (attempts >= maxAttempts) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setIsCallingApi(false);
          const msg = err instanceof Error ? err.message : "Polling timed out.";
          setGenerationError(`Generation timed out: ${msg}`);
          setGenerationErrorCode("POLLING_TIMEOUT");
        }
      }
    }, 3000);
  };

  // Video Generation Dispatch (Pixazo LTX 2.5 Lite or Hugging Face)
  const handleStartGeneration = async () => {
    setStage("generating");
    setIsCallingApi(true);
    setJobProgress(20);
    setGenerationError(null);
    setGenerationErrorCode(null);

    try {
      const res = await fetch("/api/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          masterPrompt,
          model: selectedModel,
          provider: activeModelObj.provider,
          durationSeconds: 5,
          aspectRatio: "16:9",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const errMsg = data.job?.error || data.error || "Video generation failed.";
        setGenerationError(errMsg);
        setGenerationErrorCode(data.job?.errorCode || data.code || "GENERATION_FAILED");
        if (data.job?.jobId && typeof window !== "undefined") {
          localStorage.setItem("neura_job_id", data.job.jobId);
        }
        setIsCallingApi(false);
        return;
      }

      const jobId = data.job?.jobId;
      if (jobId && typeof window !== "undefined") {
        localStorage.setItem("neura_job_id", jobId);
      }

      // Fast synchronous completion (e.g. data URL returned directly)
      if (data.job?.status === "completed" && data.job?.videoUrl) {
        if (typeof window !== "undefined") {
          localStorage.setItem("neura_video_url", data.job.videoUrl);
        }
        setIsCallingApi(false);
        setStage("complete");
        return;
      }

      // Asynchronous job accepted by Pixazo/provider: start polling status
      if (jobId) {
        pollJobStatus(jobId);
      } else {
        setIsCallingApi(false);
        setGenerationError("No job identifier returned by provider.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error contacting video pipeline.";
      setGenerationError(msg);
      setGenerationErrorCode("NETWORK_ERROR");
      setIsCallingApi(false);
    }
  };

  const prepStageIdx = Math.floor(prepProgress / (100 / PREP_STEPS.length));

  return (
    <div className="dark-cinematic min-h-[calc(100vh-64px)] w-full bg-background text-foreground flex flex-col relative overflow-hidden transition-colors duration-1000">
      {/* Background elements */}
      <div className="absolute inset-0 neura-grid-dark opacity-10 pointer-events-none" />
      <div className="aurora-bg" />

      {/* ─── STAGE 1: PLANNING PREVIEW ─── */}
      {stage === "planning" && (
        <div className="container mx-auto px-4 py-16 max-w-2xl flex flex-col items-center text-center relative z-10 flex-1 justify-center">
          <div className="mb-2 inline-flex items-center gap-2 text-xs text-primary font-mono bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
            Hugging Face Qwen Planning Engine
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3 mt-4 text-foreground">
            Structuring Concept
          </h1>
          <p className="text-muted-foreground mb-10 text-lg">
            Neura has synthesized your topic into a structured visual blueprint.
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
              <CheckCircle2 className="h-4 w-4" /> Ready for Model Dispatch
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

      {/* ─── STAGE 2: REVIEW / SELECT MODEL ─── */}
      {stage === "reviewing" && (
        <div className="container mx-auto px-4 py-8 max-w-6xl relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2 text-foreground">
              Review Master Prompt & Video Engine
            </h1>
            <p className="text-muted-foreground">
              Lesson plan created by Hugging Face Qwen. Choose your AI video renderer below.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Sidebar: Model Selector & Settings */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="bg-black/40 backdrop-blur-xl border-white/10">
                <CardHeader className="border-b border-white/10 pb-4">
                  <CardTitle className="text-base flex items-center gap-2 text-foreground">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Video Generation Engine
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-mono uppercase text-muted-foreground">Select Model</label>
                    <div className="space-y-2.5">
                      {VIDEO_MODELS.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedModel(m.id)}
                          className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all relative ${
                            selectedModel === m.id
                              ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(15,164,175,0.25)] text-white ring-1 ring-primary/40"
                              : "border-white/10 bg-white/5 hover:border-white/20 text-slate-300"
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold flex items-center gap-1.5">
                              {m.name}
                              {m.isRecommended && (
                                <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                              )}
                            </span>
                            <Badge variant="outline" className={`border-primary/40 text-[10px] py-0 ${m.isRecommended ? "bg-primary/20 text-primary border-primary" : ""}`}>
                              {m.badge}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-400 mb-1 leading-snug">
                            {m.description}
                          </p>
                          <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono pt-1 border-t border-white/5">
                            <span>Cost: {m.cost}</span>
                            <span className="uppercase">{m.provider}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10 space-y-2 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Gateway Provider</span>
                      <span className="font-mono text-foreground font-semibold">
                        {activeModelObj.provider === "pixazo" ? "Pixazo Gateway" : "Hugging Face Router"}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Target Duration</span>
                      <span className="font-mono text-foreground">5 Seconds (Safe Initial Test)</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Resolution</span>
                      <span className="font-mono text-foreground">720p (3D High Definition)</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Estimated Cost</span>
                      <span className="font-mono text-emerald-400 font-semibold">
                        {activeModelObj.provider === "pixazo" ? "$0.45" : "HF Account Credits"}
                      </span>
                    </div>
                  </div>

                  {activeModelObj.provider === "pixazo" ? (
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-[11px] text-slate-200 leading-relaxed">
                      <strong>Pixazo LTX 2.5 Lite:</strong> Generates asynchronous high-fidelity educational video. Uses your server-side <code className="text-primary font-mono">PIXAZO_API_KEY</code>.
                    </div>
                  ) : activeModelObj.id.includes("LTX") ? (
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-[11px] text-slate-200 leading-relaxed">
                      <strong>Hugging Face LTX 2.5:</strong> Lightricks 3D text-to-video open weights model hosted on Hugging Face Hub. Uses your server-side <code className="text-primary font-mono">HF_TOKEN</code>.
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 leading-relaxed">
                      <strong>Hugging Face Serverless:</strong> Requires pre-paid inference credits or PRO subscription on Hugging Face.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Prompt Editor */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <Card className="flex-1 bg-[#EEF4FF] border-white/10 shadow-lg flex flex-col overflow-hidden text-slate-900">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white gap-3">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-500 font-mono">
                      {masterPrompt.length} chars
                    </span>
                    {hasUnsaved && (
                      <span className="text-amber-600 flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                        Unsaved changes
                      </span>
                    )}
                    {saveState === "saved" && !hasUnsaved && (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Saved
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 text-xs text-slate-600 hover:bg-slate-100"
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
                      className="h-8 px-3 text-xs text-slate-600 hover:bg-slate-100"
                      onClick={handleResetPrompt}
                    >
                      <RefreshCw className="mr-1 h-3 w-3" />Reset
                    </Button>
                    {hasUnsaved && (
                      <Button
                        size="sm"
                        className="h-8 px-3 text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
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
                    className="flex-1 min-h-[320px] resize-none bg-transparent border-0 text-sm p-6 focus-visible:ring-0 leading-relaxed font-mono text-slate-800"
                    value={masterPrompt}
                    onChange={(e) => handlePromptChange(e.target.value)}
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end mt-2">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground h-14 px-8 text-base shadow-lg transition-all duration-200 hover:-translate-y-0.5 group relative overflow-hidden"
                  onClick={handleStartGeneration}
                >
                  <Play className="w-4 h-4 mr-2" /> Approve & Generate with {activeModelObj.name}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── STAGE 3: GENERATING OR ERROR STATUS ─── */}
      {(stage === "generating" || stage === "complete") && (
        <div className="container mx-auto px-4 py-16 max-w-3xl flex flex-col items-center relative z-10 flex-1 justify-center animate-in fade-in duration-700">
          {/* Active Generation State */}
          {isCallingApi && (
            <div className="text-center space-y-6 w-full">
              <div className="w-16 h-16 rounded-3xl bg-primary/20 border border-primary/40 flex items-center justify-center mx-auto relative">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <div className="absolute inset-0 rounded-3xl bg-primary/20 animate-ping opacity-40" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Generating 3D Educational Video
              </h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Processing through <strong>{activeModelObj.name}</strong> ({activeModelObj.provider === "pixazo" ? "Pixazo Gateway" : "Hugging Face"}).
              </p>
              <div className="w-full max-w-md mx-auto space-y-2">
                <Progress value={jobProgress} className="h-1.5 bg-white/10" />
                <span className="text-xs text-muted-foreground font-mono">
                  {jobProgress < 30 ? "Stage: Queued on gateway..." : "Stage: Asynchronous 3D synthesis in progress..."}
                </span>
              </div>
            </div>
          )}

          {/* Error / Credits Blocked State */}
          {!isCallingApi && generationError && (
            <Card className="w-full bg-black/60 backdrop-blur-2xl border-destructive/40 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2">
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-destructive/10 border border-destructive/30 flex items-center justify-center text-destructive shrink-0">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white">Video Rendering Status</h3>
                      <Badge variant="outline" className="border-destructive/40 text-destructive text-xs font-mono">
                        {generationErrorCode || "FAILED"}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {generationError}
                    </p>
                  </div>
                </div>

                {generationErrorCode === "PIXAZO_KEY_MISSING" && (
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-xs text-slate-200 space-y-2">
                    <p className="font-semibold flex items-center gap-1.5 text-primary">
                      <ExternalLink className="w-3.5 h-3.5" />
                      Configure Pixazo API Key
                    </p>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      To generate video using Pixazo LTX 2.5 Lite, add your subscription key to your private <code className="bg-black/40 px-1 py-0.5 rounded font-mono text-primary">.env.local</code> file:
                    </p>
                    <pre className="bg-black/60 p-2.5 rounded font-mono text-[11px] text-slate-300 border border-white/10">
                      PIXAZO_API_KEY=your_pixazo_key_here
                    </pre>
                    <a
                      href="https://pixazo.ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary font-semibold underline hover:text-primary/80 pt-1"
                    >
                      Get a Pixazo API Key at pixazo.ai <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {generationErrorCode === "PIXAZO_INSUFFICIENT_FUNDS" && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 space-y-2">
                    <p className="font-semibold flex items-center gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5" />
                      Pixazo Account Balance Required
                    </p>
                    <p className="text-[11px] text-amber-300/90 leading-relaxed">
                      Your Pixazo account balance has insufficient funds. Top up your balance on Pixazo.ai to render videos. Your prompt and educational plan remain saved.
                    </p>
                    <a
                      href="https://pixazo.ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-amber-400 font-semibold underline hover:text-amber-300 pt-1"
                    >
                      Manage Pixazo Billing <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {generationErrorCode === "HF_CREDITS_EXHAUSTED" && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 space-y-2">
                    <p className="font-semibold flex items-center gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5" />
                      Hugging Face Inference Credit Required
                    </p>
                    <p className="text-[11px] text-amber-300/90 leading-relaxed">
                      Hugging Face serverless inference requires pre-paid credits. Alternatively, select Pixazo LTX 2.5 Lite.
                    </p>
                    <a
                      href="https://huggingface.co/settings/billing"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-amber-400 font-semibold underline hover:text-amber-300 pt-1"
                    >
                      Manage Hugging Face Billing & Credits <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {generationErrorCode === "HF_MODEL_NOT_SUPPORTED" && (
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-xs text-slate-200 space-y-2">
                    <p className="font-semibold flex items-center gap-1.5 text-primary">
                      <ExternalLink className="w-3.5 h-3.5" />
                      Hugging Face LTX 2.5 Model Hub
                    </p>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      The official Lightricks LTX 2.5 model is an open-weights diffusion model on Hugging Face Hub. To render video directly via serverless GPU without setting up a dedicated GPU cluster, you can switch to the <strong>Pixazo LTX 2.5 Lite</strong> engine.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedModel("ltx-2-5-lite");
                          setStage("reviewing");
                        }}
                        className="bg-primary text-black hover:bg-primary/90 text-xs font-semibold h-8"
                      >
                        Switch to Pixazo LTX 2.5 Lite
                      </Button>
                      <a
                        href="https://huggingface.co/Lightricks/LTX-2.5"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary font-semibold underline hover:text-primary/80 px-2 py-1"
                      >
                        View LTX 2.5 on Hugging Face <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setStage("reviewing")}
                    className="w-full sm:w-auto border-white/20 hover:bg-white/10 text-white"
                  >
                    Change Model / Settings
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleStartGeneration}
                    className="w-full sm:w-auto border-white/20 hover:bg-white/10 text-white"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry Generation
                  </Button>
                  <Button
                    onClick={() => router.push("/result")}
                    className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  >
                    View Lesson Plan & Prompt <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Success / Completed State */}
          {!isCallingApi && stage === "complete" && !generationError && (
            <div className="text-center space-y-6 animate-in fade-in">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-white">
                Educational Video Generated
              </h2>
              <p className="text-slate-400 text-sm max-w-md mx-auto">
                Model: <strong>{activeModelObj.name}</strong> • High-Definition 3D Animation Rendered
              </p>
              <Button
                size="lg"
                onClick={() => router.push("/result")}
                className="bg-primary hover:bg-primary/90 text-primary-foreground h-14 px-10 text-lg shadow-xl"
              >
                <Film className="w-5 h-5 mr-2" />
                View Rendered Video & Lesson Plan
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
