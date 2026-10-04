"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, ChevronRight, Sparkles } from "lucide-react";
import { ScrollRevealProvider } from "@/lib/utils/scrollReveal";
import { NeuralRibbon } from "@/components/ui/NeuralRibbon";

const EXAMPLE_PROMPTS = [
  "Explain how the human heart pumps blood through the body",
  "Explain Newton's laws of motion using a 3D visualization",
  "Show how photosynthesis converts sunlight into energy",
  "Explore the solar system and its planetary orbits in 3D",
  "Visualize how DNA replication works inside a cell",
];

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
        }, 35);
      } else {
        timeout = setTimeout(() => setIsDeleting(true), 2200);
      }
    } else {
      if (charIdx > 0) {
        timeout = setTimeout(() => {
          setDisplayText(currentPrompt.slice(0, charIdx - 1));
          setCharIdx((c) => c - 1);
        }, 18);
      } else {
        setTimeout(() => {
          setIsDeleting(false);
          setPromptIndex((i) => (i + 1) % EXAMPLE_PROMPTS.length);
        }, 0);
      }
    }
    return () => clearTimeout(timeout);
  }, [charIdx, isDeleting, currentPrompt]);

  const handleUsePrompt = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("neura_topic", currentPrompt);
    }
    router.push("/create");
  }, [currentPrompt, router]);

  return (
    <>
      <ScrollRevealProvider />
      <section className="relative overflow-hidden py-20 lg:py-28 neura-grid-light">
        <div className="aurora-bg" />

        <div className="container px-4 md:px-8 mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            <div className="flex flex-col items-start z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs text-primary mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 shadow-sm">
                <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                Neura Aurora — Experience Upgrade
              </div>

              <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100 text-foreground">
                Turn ideas into{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] via-[#4F46E5] to-[#7C3AED]">
                  intelligent visual stories.
                </span>
              </h1>

              <p className="text-lg text-muted-foreground max-w-md mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
                Neura transforms educational topics and creative ideas into
                cinematic AI-generated 3D videos with full creative control.
              </p>

              <div className="w-full mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
                <div className="rounded-xl border border-border bg-card/60 backdrop-blur-md p-4 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="text-[11px] text-primary uppercase tracking-widest mb-2 font-mono font-medium">
                    Try an example
                  </div>
                  <div className="font-medium text-foreground min-h-[1.5rem] flex items-center gap-1 text-base">
                    <span>{displayText}</span>
                    <span className="animate-blink text-primary font-light">|</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleUsePrompt}
                    className="mt-3 text-[#2563EB] hover:text-[#4F46E5] hover:bg-primary/5 px-2 -ml-2 h-auto py-1 text-xs transition-all duration-175"
                  >
                    Use this prompt <ChevronRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-400">
                <Link href="/create">
                  <Button
                    size="lg"
                    className="h-13 px-7 text-base bg-gradient-to-r from-[#4F46E5] to-[#2563EB] hover:from-[#312E81] hover:to-[#4F46E5] text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-250"
                  >
                    Create Video <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="#how-it-works">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-13 px-7 text-base border-border bg-card/50 hover:bg-card hover:text-primary transition-all duration-250"
                  >
                    <Play className="mr-2 h-4 w-4" /> See How It Works
                  </Button>
                </Link>
              </div>
            </div>

            <div className="hidden lg:flex flex-col items-center justify-center animate-in fade-in slide-in-from-right-8 duration-700 delay-200">
              <div className="w-full bg-card/40 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-xl">
                <div className="text-sm font-semibold text-center mb-6 text-foreground/80">NEURA PIPELINE</div>
                <NeuralRibbon />
              </div>
            </div>
            
          </div>
        </div>
      </section>
    </>
  );
}
