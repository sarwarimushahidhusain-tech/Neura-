"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  PlayCircle,
  Download,
  RefreshCw,
  Plus,
  Trophy,
  FileText,
  ChevronDown,
  ChevronUp,
  BarChart2,
  LayoutGrid,
} from "lucide-react";

type Tab = "overview" | "scores" | "prompt" | "versions";

const METRICS = [
  { label: "Prompt Match", score: 94 },
  { label: "Visual Quality", score: 92 },
  { label: "Subject Accuracy", score: 91 },
  { label: "Consistency", score: 90 },
  { label: "Motion Quality", score: 89 },
];

const VERSIONS = [
  { model: "HunyuanVideo", score: 91, isBest: true, color: "bg-[#7C3AED]" },
  { model: "LTX", score: 84, isBest: false, color: "bg-[#2563EB]" },
  { model: "CogVideoX", score: 79, isBest: false, color: "bg-[#4F46E5]" },
];

const MASTER_PROMPT =
  "Create a scientifically accurate cinematic 3D medical visualization of the human heart. Show the complete anatomical heart with realistic cardiac tissue and clearly visible chambers and major blood vessels. Transition into a semi-transparent cutaway view revealing the right atrium, left atrium, right ventricle, left ventricle, and major valves. Visualize oxygen-poor blood entering the right side of the heart and oxygen-rich blood leaving the left ventricle through the aorta. Use smooth camera movement, realistic lighting, scientifically grounded anatomy, clean educational presentation, and consistent anatomical structure throughout the video. Dark blue scientific background, high visual clarity, no text overlays, no subtitles, no watermark.";

function AnimatedScore({ target }: { target: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef(false);

  useEffect(() => {
    if (ref.current) return;
    ref.current = true;
    const duration = 900;
    const step = 16;
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += step;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(target * ease));
      if (t >= 1) clearInterval(interval);
    }, step);
    return () => clearInterval(interval);
  }, [target]);

  return <span>{val}</span>;
}

function AnimatedBar({ target, colorClass = "bg-primary" }: { target: number, colorClass?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef(false);

  useEffect(() => {
    if (ref.current) return;
    ref.current = true;
    const duration = 900;
    const step = 16;
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += step;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(target * ease));
      if (t >= 1) clearInterval(interval);
    }, step);
    return () => clearInterval(interval);
  }, [target]);

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={`h-full transition-all duration-300 ease-out ${colorClass}`}
        style={{ width: `${val}%` }}
      />
    </div>
  );
}

export default function ResultPage() {
  const [topic, setTopic] = useState("How the Human Heart Pumps Blood");
  const [tab, setTab] = useState<Tab>("overview");
  const [selectedVersion, setSelectedVersion] = useState("HunyuanVideo");
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("neura_topic");
      if (saved) setTimeout(() => setTopic(saved), 0);
    }
  }, []);

  const selected = VERSIONS.find((v) => v.model === selectedVersion)!;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <LayoutGrid className="h-4 w-4" /> },
    { id: "scores", label: "Scores", icon: <BarChart2 className="h-4 w-4" /> },
    { id: "prompt", label: "Prompt", icon: <FileText className="h-4 w-4" /> },
    { id: "versions", label: "Versions", icon: <RefreshCw className="h-4 w-4" /> },
  ];

  return (
    <div className="bg-background min-h-[calc(100vh-64px)] w-full">
      {/* Top Banner Aurora */}
      <div className="absolute top-0 left-0 w-full h-[300px] overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full bg-gradient-to-b from-primary/10 to-transparent blur-3xl rounded-full" />
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
            <div className="text-xs text-primary font-semibold tracking-widest uppercase mb-2">Final Video</div>
            <h1 className="text-3xl font-bold tracking-tight mb-1.5 text-foreground">{topic}</h1>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="bg-card border-border hover:bg-muted transition-colors">
              <RefreshCw className="w-4 h-4 mr-2" /> Regenerate
            </Button>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5">
              <Download className="w-4 h-4 mr-2" /> Download MP4
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Dark Cinematic Video Player */}
            <Card className="bg-[#0B1020] border-slate-800 overflow-hidden shadow-2xl animate-in fade-in duration-700 p-1">
              <div className="rounded-xl overflow-hidden relative">
                <div className="aspect-[16/9] relative group flex items-center justify-center bg-gradient-to-br from-[#0B1020] to-black cursor-pointer">
                  {/* Grid overlay */}
                  <div className="absolute inset-0 neura-grid-dark opacity-10" />

                  {/* Abstract content */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative w-56 h-56 opacity-50 group-hover:opacity-70 transition-opacity duration-700">
                      <div className="absolute inset-0 bg-red-800/40 rounded-full blur-3xl animate-pulse" />
                      <div className="absolute top-1/4 left-1/2 -translate-x-full w-[45%] h-[50%] rounded-tl-full bg-red-600/60 border border-red-500/30" />
                      <div className="absolute top-1/4 left-1/2 w-[45%] h-[50%] rounded-tr-full bg-red-600/60 border border-red-500/30" />
                      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[90%] h-[40%] bg-red-700/60 rounded-b-full border border-red-500/30" style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
                    </div>
                  </div>

                  {/* Play button */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors duration-300">
                    <div className="h-20 w-20 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.1)] border border-white/20 group-hover:scale-110 group-hover:bg-primary/90 group-hover:border-primary transition-all duration-300">
                      <PlayCircle className="w-10 h-10 text-white ml-0.5" strokeWidth={1.5} />
                    </div>
                  </div>

                  {/* Fake progress bar */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
                    <div className="flex items-center gap-3 text-white">
                      <PlayCircle className="w-5 h-5 opacity-70" />
                      <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                        <div className="w-1/3 h-full bg-primary" />
                      </div>
                      <span className="text-xs font-mono opacity-70">0:03 / 0:10</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="px-5 py-4 flex justify-between items-center text-slate-100">
                <div className="flex items-center gap-3">
                  <Badge className={`${selected.color} border-0 hover:${selected.color}`}>
                    {selectedVersion}
                  </Badge>
                  {selected.isBest && (
                    <Badge variant="outline" className="border-white/20 text-slate-300 bg-white/5">
                      <Trophy className="h-3 w-3 mr-1 text-yellow-400" /> Best Result
                    </Badge>
                  )}
                </div>
                <div className="text-2xl font-bold font-mono tracking-tight">
                  <AnimatedScore target={selected.score} />
                  <span className="text-slate-500 text-sm font-sans tracking-normal">/100</span>
                </div>
              </div>
            </Card>

            {/* Tab bar */}
            <div className="flex p-1.5 bg-muted rounded-xl border border-border gap-1">
              {tabs.map(({ id, label, icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    tab === id
                      ? "bg-card text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground hover:bg-black/5"
                  }`}
                  aria-current={tab === id ? "true" : undefined}
                >
                  {icon}
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            {/* Tab content */}
            <Card className="bg-card border-border shadow-sm animate-in fade-in duration-300 min-h-[300px]">
              <CardContent className="p-6 md:p-8">
                
                {tab === "overview" && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-foreground border-b border-border pb-3">Generation Details</h3>
                    <div className="grid sm:grid-cols-2 gap-6 text-sm">
                      {[
                        ["Selected Model", selectedVersion],
                        ["Duration", "10 seconds"],
                        ["Style", "3D Cinematic"],
                        ["Aspect Ratio", "16:9"],
                        ["Target Audience", "College"],
                        ["Resolution", "4K (3840x2160)"],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">{k}</div>
                          <div className="font-medium text-foreground text-base">{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {tab === "scores" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center border-b border-border pb-3">
                      <h3 className="text-lg font-semibold text-foreground">AI Evaluation</h3>
                      <span className="text-2xl font-mono font-bold text-primary">{selected.score}</span>
                    </div>
                    <div className="space-y-5">
                      {METRICS.map((m) => (
                        <div key={m.label} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium text-foreground">{m.label}</span>
                            <span className="font-mono text-muted-foreground">
                              <AnimatedScore target={m.score} />/100
                            </span>
                          </div>
                          <AnimatedBar target={m.score} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {tab === "prompt" && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-foreground border-b border-border pb-3">Master Prompt</h3>
                    <p className="text-sm text-foreground/90 font-mono leading-relaxed bg-muted p-5 rounded-xl border border-border shadow-inner">
                      &quot;{MASTER_PROMPT}&quot;
                    </p>
                  </div>
                )}

                {tab === "versions" && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-foreground border-b border-border pb-3">Model Comparisons</h3>
                    <div className="grid gap-4">
                      {VERSIONS.map((v) => (
                        <button
                          key={v.model}
                          type="button"
                          onClick={() => setSelectedVersion(v.model)}
                          className={`w-full text-left p-5 rounded-xl border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                            selectedVersion === v.model
                              ? "border-primary bg-primary/5 shadow-[0_0_15px_rgba(79,70,229,0.1)]"
                              : "border-border bg-card hover:border-primary/30 hover:bg-muted"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`h-3 w-3 rounded-full ${selectedVersion === v.model ? v.color : "bg-muted-foreground/30"}`} />
                              <span className={`font-semibold ${selectedVersion === v.model ? "text-foreground" : "text-muted-foreground"}`}>
                                {v.model}
                              </span>
                              {v.isBest && (
                                <Badge className={`${v.color} text-white border-0 text-[10px] ml-2`}>
                                  <Trophy className="h-3 w-3 mr-1" />Best
                                </Badge>
                              )}
                            </div>
                            <span className={`font-mono font-bold text-lg ${selectedVersion === v.model ? "text-primary" : "text-muted-foreground"}`}>
                              {v.score}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right sidebar */}
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 delay-200">
            
            {/* Master prompt toggle */}
            <Card className="bg-card border-border shadow-sm overflow-hidden">
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setShowPrompt(!showPrompt)}
                aria-expanded={showPrompt}
              >
                <CardHeader className="py-5 cursor-pointer hover:bg-muted transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2 text-foreground">
                      <FileText className="w-4 h-4 text-primary" />
                      Quick Prompt View
                    </CardTitle>
                    {showPrompt ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
              </button>
              {showPrompt && (
                <CardContent className="p-5 border-t border-border bg-muted text-xs text-muted-foreground font-mono leading-relaxed animate-in fade-in duration-200">
                  &quot;{MASTER_PROMPT}&quot;
                </CardContent>
              )}
            </Card>

            {/* Actions */}
            <Card className="bg-card border-border shadow-sm">
              <CardContent className="p-6 space-y-3">
                <Link href="/create" className="block">
                  <Button
                    className="w-full justify-start h-12 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all duration-200 hover:-translate-y-0.5"
                  >
                    <Plus className="w-4 h-4 mr-3" />
                    Create Another Video
                  </Button>
                </Link>
                <Separator className="bg-border my-2" />
                <Link href="/projects" className="block">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-12 border-border text-foreground hover:bg-muted transition-colors"
                  >
                    <LayoutGrid className="w-4 h-4 mr-3 text-muted-foreground" />
                    View All Projects
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
