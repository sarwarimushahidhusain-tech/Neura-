"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";

const EXAMPLE_PROMPTS = [
  "DNA replication inside a living cell",
  "Newton's laws of motion with 3D visualization",
  "How the human heart pumps blood",
  "The solar system and planetary orbits",
  "Photosynthesis converting sunlight to energy",
];

function ProductionViz() {
  const scenes = [
    "Scene 01 — Intro",
    "Scene 02 — Core Concept",
    "Scene 03 — Visual Demo",
    "Scene 04 — Conclusion"
  ];
  const [activeScene, setActiveScene] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setActiveScene((s) => (s + 1) % scenes.length);
    }, 2200);
    return () => clearInterval(t);
  }, [scenes.length]);

  return (
    <div className="relative w-full max-w-lg mx-auto lg:max-w-none">
      {/* Ambient background orbital curves matching screenshot */}
      <div className="absolute -inset-16 pointer-events-none" aria-hidden="true">
        <svg className="w-full h-full opacity-30" viewBox="0 0 600 500" fill="none">
          <ellipse cx="320" cy="240" rx="260" ry="140" stroke="#00D4E8" strokeWidth="0.6" strokeDasharray="4 8" transform="rotate(-15 320 240)" />
          <ellipse cx="320" cy="240" rx="300" ry="180" stroke="#9565F5" strokeWidth="0.4" strokeDasharray="3 9" transform="rotate(25 320 240)" />
          <circle cx="210" cy="140" r="2.5" fill="#00D4E8" />
          <circle cx="480" cy="310" r="2.5" fill="#00C9B7" />
        </svg>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-[#00D4E8]/10 blur-[90px] rounded-full pointer-events-none" />
      </div>

      {/* Floating Card: AI Lesson Plan (top right) */}
      <div className="absolute -top-6 -right-2 sm:right-6 z-20 animate-float-1">
        <div className="rounded-xl px-3.5 py-2.5 text-xs border border-[#1B2635] bg-[#0B101C]/90 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D4E8] shadow-[0_0_8px_rgba(0,212,232,0.9)]" />
            <span className="text-[#9AA8BC] font-mono uppercase tracking-wider text-[10px]">AI Lesson Plan</span>
          </div>
          <div className="text-[#F5F7FC] font-medium text-[11px]">4 scenes · 10s</div>
          <div className="text-[#9AA8BC] text-[10px] font-mono">00:00:10:14</div>
        </div>
      </div>

      {/* Floating Card: Selected Video Model (bottom right) */}
      <div className="absolute -bottom-5 right-2 sm:right-8 z-20 animate-float-2">
        <div className="rounded-xl px-3.5 py-2.5 text-xs border border-[#1B2635] bg-[#0B101C]/90 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
          <div className="text-[#9565F5] font-mono text-[11px] font-semibold">HunyuanVideo</div>
          <div className="text-[#9AA8BC] text-[10px]">Best result</div>
        </div>
      </div>

      {/* Main Production Interface Window */}
      <div className="relative rounded-2xl border border-[#00D4E8]/25 bg-[#0B101C]/95 backdrop-blur-xl p-6 shadow-[0_0_50px_rgba(0,212,232,0.08)]">
        {/* Subtle grid background */}
        <div className="absolute inset-0 neura-grid opacity-30 rounded-2xl pointer-events-none" />

        {/* Top bar with REC indicator */}
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            <span className="text-[11px] font-mono text-[#F5F7FC] tracking-widest uppercase">REC</span>
          </div>
        </div>

        {/* Scene Breakdown List */}
        <div className="space-y-3 mb-8 relative z-10">
          {scenes.map((scene, i) => {
            const isSelected = i === activeScene;
            return (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-300 ${
                  isSelected
                    ? "bg-[#00D4E8]/10 border border-[#00D4E8]/30 shadow-[0_0_15px_rgba(0,212,232,0.1)]"
                    : "border border-transparent hover:border-[#1B2635] bg-transparent"
                }`}
              >
                <div
                  className={`w-5 h-px transition-colors duration-300 ${
                    isSelected ? "bg-[#00D4E8]" : "bg-[#1B2635]"
                  }`}
                />
                <span
                  className={`text-xs font-mono transition-colors duration-300 ${
                    isSelected ? "text-[#00D4E8] font-medium" : "text-[#9AA8BC]"
                  }`}
                >
                  {scene}
                </span>
                {isSelected && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00D4E8] animate-pulse" />
                )}
              </div>
            );
          })}
        </div>

        {/* Waveform Visualization */}
        <div className="mb-4 relative z-10">
          <div className="flex items-end justify-between gap-1 h-9 mb-2 px-1">
            {Array.from({ length: 42 }).map((_, i) => {
              const heightPct = 25 + Math.sin(i * 0.45) * 40 + Math.sin(i * 1.2) * 20;
              const isWaveActive = i < 28;
              return (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-300 ${
                    isWaveActive
                      ? "bg-[#00D4E8] opacity-80"
                      : "bg-[#1B2635] opacity-50"
                  }`}
                  style={{ height: `${Math.round(Math.max(15, Math.min(95, heightPct)))}%` }}
                />
              );
            })}
          </div>

          {/* Scrubber Timeline */}
          <div className="relative h-1 bg-[#1B2635] rounded-full overflow-visible">
            <div className="absolute left-0 top-0 bottom-0 w-[67%] bg-gradient-to-r from-[#00D4E8] to-[#00C9B7] rounded-full" />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-[0_0_12px_rgba(0,212,232,0.9)] cursor-pointer"
              style={{ left: "calc(67% - 7px)" }}
            />
          </div>
        </div>

        {/* Bottom Metadata: Quality score */}
        <div className="pt-2 relative z-10">
          <div className="text-[10px] font-mono text-[#9AA8BC] uppercase tracking-wider mb-0.5">
            Quality Score
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[#00D4E8] font-bold font-mono text-xl">91</span>
            <span className="text-[#9AA8BC] text-xs font-mono">/ 100</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  const router = useRouter();
  const [promptIndex, setPromptIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [charIdx, setCharIdx] = useState(0);

  const currentPrompt = EXAMPLE_PROMPTS[promptIndex];

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (!isDeleting) {
      if (charIdx < currentPrompt.length) {
        timeout = setTimeout(() => {
          setDisplayText(currentPrompt.slice(0, charIdx + 1));
          setCharIdx((c) => c + 1);
        }, 36);
      } else {
        timeout = setTimeout(() => setIsDeleting(true), 2600);
      }
    } else {
      if (charIdx > 0) {
        timeout = setTimeout(() => {
          setDisplayText(currentPrompt.slice(0, charIdx - 1));
          setCharIdx((c) => c - 1);
        }, 18);
      } else {
        timeout = setTimeout(() => {
          setIsDeleting(false);
          setPromptIndex((i) => (i + 1) % EXAMPLE_PROMPTS.length);
        }, 0);
      }
    }
    return () => clearTimeout(timeout);
  }, [charIdx, isDeleting, currentPrompt]);

  const handleUseTopic = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("neura_topic", currentPrompt);
    }
    router.push(`/create?topic=${encodeURIComponent(currentPrompt)}`);
  }, [currentPrompt, router]);

  return (
    <section
      id="hero"
      className="relative overflow-hidden pt-12 pb-24 lg:pt-16 lg:pb-32 neura-grid"
      aria-labelledby="hero-heading"
    >
      {/* Background ambient lighting */}
      <div className="aurora-bg" aria-hidden="true" />

      <div className="container px-4 md:px-8 mx-auto max-w-6xl relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left Column: Heading, badge, description, example topic */}
          <div className="flex flex-col items-start">
            {/* Top pill badge matching screenshot 1 */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#00D4E8]/40 bg-[#00D4E8]/5 px-3.5 py-1.5 text-[11px] text-[#00D4E8] font-mono uppercase tracking-widest mb-8 shadow-[0_0_15px_rgba(0,212,232,0.15)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D4E8] shadow-[0_0_8px_rgba(0,212,232,0.9)]" />
              <span>NEXT-GEN AI VIDEO // THE FUTURE OF VISUAL LEARNING</span>
            </div>

            {/* Main title broken across lines */}
            <h1
              id="hero-heading"
              className="text-5xl sm:text-6xl lg:text-[68px] font-extrabold tracking-tight leading-[1.08] mb-6"
            >
              <span className="text-[#F5F7FC] block">Turn Any Idea</span>
              <span className="text-[#F5F7FC] block">Into a</span>
              <span className="gradient-cyan-teal block">Cinematic</span>
              <span className="gradient-cyan-teal block">Learning</span>
              <span className="text-[#F5F7FC] block">Experience.</span>
            </h1>

            {/* Supporting description */}
            <p className="text-sm md:text-base text-[#9AA8BC] max-w-lg mb-8 leading-relaxed">
              Transform complex topics into engaging educational video experiences with{" "}
              <strong className="text-[#F5F7FC] font-semibold">AI-powered lesson planning</strong> and{" "}
              <span className="text-[#00D4E8] font-semibold">multi-model cinematic generation</span>.
            </p>

            {/* Example Topic Box matching screenshot 1 */}
            <div className="w-full max-w-md rounded-2xl border border-[#00D4E8]/30 bg-[#0B101C]/80 backdrop-blur-md p-4 shadow-[0_0_30px_rgba(0,212,232,0.06)]">
              <div className="text-[10px] text-[#00D4E8] uppercase tracking-wider font-mono mb-1.5 font-medium">
                EXAMPLE TOPIC
              </div>
              <div className="font-normal text-[#F5F7FC] min-h-[1.5rem] flex items-center gap-1 text-sm">
                <span>{displayText}</span>
                <span className="animate-blink text-[#00D4E8]">|</span>
              </div>
              <button
                type="button"
                onClick={handleUseTopic}
                className="mt-3 flex items-center gap-1 text-[#00D4E8] text-xs font-medium hover:text-[#00C9B7] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00D4E8]"
              >
                Use this topic <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Right Column: Stylized Video-Production Timeline Visualization */}
          <div className="w-full">
            <ProductionViz />
          </div>

        </div>
      </div>
    </section>
  );
}
