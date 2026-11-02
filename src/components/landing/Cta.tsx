"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, FolderKanban } from "lucide-react";

export function Cta() {
  return (
    <section
      id="cta"
      className="relative py-32 overflow-hidden neura-grid border-t border-[#1B2635]/40"
      aria-labelledby="cta-heading"
    >
      {/* Ambient glowing atmosphere matching screenshot 8 */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-[#00D4E8]/10 blur-[120px] rounded-full" />
        <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-[#9565F5]/10 blur-[100px] rounded-full" />
      </div>

      <div className="container relative z-10 mx-auto px-4 md:px-8 text-center max-w-4xl">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[#00D4E8]/30 bg-[#00D4E8]/5 px-3.5 py-1 text-[11px] text-[#00D4E8] font-mono uppercase tracking-widest mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00D4E8] shadow-[0_0_6px_rgba(0,212,232,0.8)]" />
          <span>05 // GET STARTED TODAY</span>
        </div>

        {/* Heading */}
        <h2
          id="cta-heading"
          className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 text-[#F5F7FC]"
        >
          Your Next Great Lesson{" "}
          <span className="gradient-warm-cyan">Starts With an Idea.</span>
        </h2>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-[#9AA8BC] mb-10 max-w-xl mx-auto leading-relaxed">
          Create a more visual way to understand the world. Zero production experience required.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link href="/create">
            <Button
              size="lg"
              className="bg-gradient-to-r from-[#00D4E8] to-[#00C9B7] hover:opacity-95 text-[#050810] font-bold text-sm px-8 h-12 rounded-full shadow-[0_0_25px_rgba(0,212,232,0.4)] hover:shadow-[0_0_35px_rgba(0,212,232,0.6)] hover:-translate-y-0.5 transition-all duration-200 gap-2 flex items-center"
            >
              Start Creating <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>

          <Link href="/projects">
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-7 rounded-full border-[#1B2635] bg-[#0B101C]/80 text-[#9AA8BC] hover:text-[#F5F7FC] hover:border-[#00D4E8]/30 hover:bg-[#101625] transition-all duration-200 gap-2"
            >
              <FolderKanban className="h-4 w-4 text-[#9AA8BC]" />
              View Projects
            </Button>
          </Link>
        </div>

        {/* Configured Technology Attribution Row */}
        <div className="pt-8 border-t border-[#1B2635]/60 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-[11px] font-mono text-[#9AA8BC]/70">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D4E8]" />
            OpenRouter AI Planning
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF9B25]" />
            Pixazo LTX 2.5 Lite Engine
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C9B7]" />
            Supabase Cloud Persistence
          </span>
        </div>
      </div>
    </section>
  );
}
