"use client";

import { Check, Copy, Sparkles, Sliders } from "lucide-react";
import { useState } from "react";

export function Capabilities() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section
      id="capabilities"
      className="relative py-28 overflow-hidden neura-grid border-t border-[#1B2635]/40"
      aria-labelledby="capabilities-heading"
    >
      <div className="container px-4 md:px-8 mx-auto max-w-6xl relative z-10">

        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#00D4E8]/30 bg-[#00D4E8]/5 px-3.5 py-1 text-[11px] text-[#00D4E8] font-mono uppercase tracking-widest mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D4E8] shadow-[0_0_6px_rgba(0,212,232,0.8)]" />
            <span>04 // PLATFORM CAPABILITIES</span>
          </div>

          <h2
            id="capabilities-heading"
            className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-5 text-[#F5F7FC]"
          >
            Built for the Entire{" "}
            <span className="gradient-cyan-teal">Creative Journey.</span>
          </h2>

          <p className="text-sm md:text-base text-[#9AA8BC] max-w-xl mx-auto leading-relaxed">
            From natural concept to finished educational video — every step is crafted for creative control and clarity.
          </p>
        </div>

        {/* Two Large Side-by-Side Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Card 1: AI Lesson Planning */}
          <div className="rounded-2xl border border-[#1B2635] bg-[#0B101C]/90 backdrop-blur-md p-6 sm:p-7 flex flex-col justify-between shadow-[0_4px_30px_rgba(0,0,0,0.5)] transition-all duration-300 hover:border-[#00D4E8]/30">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#00D4E8]/10 border border-[#00D4E8]/30 flex items-center justify-center text-[#00D4E8]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#F5F7FC]">AI Lesson Planning</h3>
                  <p className="text-xs text-[#9AA8BC]">Automatic pedagogy structure &amp; timing</p>
                </div>
              </div>

              <p className="text-xs text-[#9AA8BC] leading-relaxed mb-5">
                Explain complex scientific or theoretical concepts in natural language. Neura crafts an educational blueprint tailored to your desired tone, duration, and target audience.
              </p>

              {/* Code editor style visualization */}
              <div className="rounded-xl border border-[#1B2635] bg-[#050810] overflow-hidden font-mono text-xs shadow-inner">
                <div className="flex items-center justify-between px-3.5 py-2 border-b border-[#1B2635] bg-[#080D18]">
                  <span className="text-[11px] text-[#00D4E8] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#00D4E8]/80" />
                    lesson-plan.json
                  </span>
                  <span className="text-[10px] text-[#9AA8BC]">AUTO-GENERATED</span>
                </div>
                <div className="p-3.5 space-y-1 text-[#9AA8BC] leading-relaxed text-[11px]">
                  <div><span className="text-[#9565F5]">&quot;topic&quot;</span>: <span className="text-[#00C9B7]">&quot;Mitochondria ATP Synthesis&quot;</span>,</div>
                  <div><span className="text-[#9565F5]">&quot;style&quot;</span>: <span className="text-[#00C9B7]">&quot;Cinematic 3D Scientific&quot;</span>,</div>
                  <div><span className="text-[#9565F5]">&quot;duration&quot;</span>: <span className="text-[#FF9B25]">10</span>,</div>
                  <div><span className="text-[#9565F5]">&quot;scenes&quot;</span>: [</div>
                  <div className="pl-4 text-[#F5F7FC]">&ldquo;01. Cellular membrane entry with slow zoom&rdquo;,</div>
                  <div className="pl-4 text-[#F5F7FC]">&ldquo;02. Inner mitochondrial cristae folding&rdquo;,</div>
                  <div className="pl-4 text-[#F5F7FC]">&ldquo;03. ATP synthase rotor molecular motion&rdquo;,</div>
                  <div className="pl-4 text-[#F5F7FC]">&ldquo;04. Energy currency release cycle&rdquo;</div>
                  <div>]</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Prompt Engineering Studio */}
          <div className="rounded-2xl border border-[#1B2635] bg-[#0B101C]/90 backdrop-blur-md p-6 sm:p-7 flex flex-col justify-between shadow-[0_4px_30px_rgba(0,0,0,0.5)] transition-all duration-300 hover:border-[#FF9B25]/30">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#FF9B25]/10 border border-[#FF9B25]/30 flex items-center justify-center text-[#FF9B25]">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#F5F7FC]">Prompt Engineering Studio</h3>
                    <p className="text-xs text-[#9AA8BC]">Direct human-in-the-loop parameter refinement</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#9AA8BC] leading-relaxed mb-5">
                Review and edit every word sent to the generative video engine before rendering. Adjust lighting keys, camera lenses, pacing, and visual depth with total freedom.
              </p>

              {/* Code editor style panel */}
              <div className="rounded-xl border border-[#1B2635] bg-[#050810] overflow-hidden font-mono text-xs shadow-inner">
                <div className="flex items-center justify-between px-3.5 py-2 border-b border-[#1B2635] bg-[#080D18]">
                  <span className="text-[11px] text-[#FF9B25] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#FF9B25]/80" />
                    master-prompt.txt
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#00C9B7] bg-[#00C9B7]/10 px-2 py-0.5 rounded">SAVED</span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="text-[#9AA8BC] hover:text-[#F5F7FC] transition-colors p-1"
                      title="Copy Prompt"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-[#00C9B7]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="p-3.5 space-y-1.5 text-[11px] leading-relaxed">
                  <div className="flex gap-3">
                    <span className="text-[#1B2635] select-none">01</span>
                    <span className="text-[#F5F7FC]">Cinematic microscopic close-up of ATP synthase rotor spinning smoothly</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-[#1B2635] select-none">02</span>
                    <span className="text-[#9AA8BC]">Volumetric bioluminescent lighting with teal and amber ion trails</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-[#1B2635] select-none">03</span>
                    <span className="text-[#9AA8BC]">Photorealistic scientific simulation, 60fps slow-motion fluid dynamics</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-[#1B2635] select-none">04</span>
                    <span className="text-[#00D4E8] font-medium">8K resolution, octane render quality, medical animation</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
