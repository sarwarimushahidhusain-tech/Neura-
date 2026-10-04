"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, PlayCircle } from "lucide-react";

export function Example() {
  return (
    <section className="py-24 bg-background overflow-hidden relative">
      <div className="absolute right-0 top-0 -z-10 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent" />
      
      <div className="container mx-auto px-4 md:px-8 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div className="reveal-on-scroll">
            <div className="text-xs text-primary uppercase tracking-widest font-mono mb-4 font-semibold">
              Example project
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6 text-foreground">
              See Neura in action
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              An abstract concept becomes a stunning, medically accurate 3D
              educational visualization — all from a single sentence.
            </p>

            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-card border border-border shadow-sm">
                <div className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wide">Topic</div>
                <div className="text-base font-medium text-foreground">
                  &quot;How the Human Heart Pumps Blood&quot;
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge className="bg-primary/10 text-primary border-0 hover:bg-primary/20 transition-colors">
                  Educational
                </Badge>
                <Badge variant="outline" className="border-border text-muted-foreground bg-card">
                  3D Cinematic
                </Badge>
                <Badge variant="outline" className="border-border text-muted-foreground bg-card">
                  College audience
                </Badge>
                <Badge variant="outline" className="border-border text-muted-foreground bg-card">
                  HunyuanVideo
                </Badge>
              </div>

              <div className="bg-card border border-border rounded-2xl p-5 mt-4">
                <div className="text-xs font-semibold text-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Generated scenes
                </div>
                <ul className="text-sm text-muted-foreground space-y-3 pl-1">
                  {[
                    "Show the complete external heart.",
                    "Reveal the four chambers and major valves.",
                    "Visualize oxygen-poor blood entering the right side.",
                    "Visualize oxygen-rich blood leaving through the aorta.",
                  ].map((scene, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 h-5 w-5 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center text-[10px] text-primary flex-shrink-0 font-medium">
                        {i + 1}
                      </span>
                      {scene}
                    </li>
                  ))}
                </ul>
              </div>

              <Link href="/create" className="inline-block mt-4">
                <Button
                  variant="outline"
                  className="bg-card border-border hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 group"
                >
                  Try this example
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Right: fake video card (Cinematic Dark Mode for Video) */}
          <div className="relative reveal-on-scroll delay-200 lg:pl-8">
            <div className="relative group rounded-2xl overflow-hidden border border-slate-800 aspect-[16/10] bg-[#0B1020] shadow-2xl">
              {/* Abstract heart background */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#0B1020] via-black to-red-950/30" />
              <div className="absolute inset-0 neura-grid-dark opacity-10" />

              {/* Heart shapes */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-44 h-44 opacity-40 group-hover:opacity-60 transition-opacity duration-700">
                  <div className="absolute inset-0 bg-red-600/30 rounded-full blur-3xl animate-pulse" />
                  <div className="absolute top-0 left-1/2 -translate-x-full w-1/2 h-3/5 rounded-tl-full rounded-tr-none bg-red-500/50 border border-red-400/30" />
                  <div className="absolute top-0 left-1/2 w-1/2 h-3/5 rounded-tr-full rounded-tl-none bg-red-500/50 border border-red-400/30" />
                  <div className="absolute bottom-0 left-0 right-0 h-3/5 -top-4 mt-auto bg-red-600/50 rounded-b-full border border-red-500/20" style={{ clipPath: "polygon(0 40%, 50% 100%, 100% 40%, 100% 0, 0 0)" }} />
                </div>
              </div>

              {/* Score badge */}
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="text-[10px] font-mono font-medium bg-black/60 backdrop-blur-md text-white border border-white/10 px-2.5 py-1 rounded-md">
                  HunyuanVideo
                </span>
                <span className="text-[10px] font-mono font-medium bg-primary/90 backdrop-blur-md text-white px-2.5 py-1 rounded-md shadow-sm">
                  91 / 100
                </span>
              </div>

              {/* Play overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors duration-300">
                <div className="h-16 w-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.1)] group-hover:scale-110 group-hover:bg-primary/90 group-hover:border-primary transition-all duration-300">
                  <PlayCircle className="h-8 w-8 text-white ml-0.5" strokeWidth={1.5} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
