"use client";

import { Brain, Edit3, Layers, CheckCircle2 } from "lucide-react";

const FEATURES = [
  {
    title: "AI Lesson Planning",
    desc: "Describe any concept and Neura structures it into a coherent scene-by-scene educational blueprint automatically.",
    icon: Brain,
    iconColor: "text-[#00D4E8]",
    iconBg: "bg-[#00D4E8]/10",
    iconBorder: "border-[#00D4E8]/30",
    badge: "4 scenes",
    badgeColor: "text-[#00D4E8] bg-[#00D4E8]/10 border-[#00D4E8]/25",
    hoverGlow: "hover:border-[#00D4E8]/40 hover:shadow-[0_0_30px_rgba(0,212,232,0.1)]",
  },
  {
    title: "Editable Master Prompt",
    desc: "Inspect exactly what gets sent to the video model and shape it for complete creative control before generation.",
    icon: Edit3,
    iconColor: "text-[#FF9B25]",
    iconBg: "bg-[#FF9B25]/10",
    iconBorder: "border-[#FF9B25]/30",
    badge: "100% control",
    badgeColor: "text-[#FF9B25] bg-[#FF9B25]/10 border-[#FF9B25]/25",
    hoverGlow: "hover:border-[#FF9B25]/40 hover:shadow-[0_0_30px_rgba(255,155,37,0.1)]",
  },
  {
    title: "Multi-Model Generation",
    desc: "Run generation across leading AI video providers and compare results side by side with full transparency.",
    icon: Layers,
    iconColor: "text-[#9565F5]",
    iconBg: "bg-[#9565F5]/10",
    iconBorder: "border-[#9565F5]/30",
    badge: "3 models",
    badgeColor: "text-[#9565F5] bg-[#9565F5]/10 border-[#9565F5]/25",
    hoverGlow: "hover:border-[#9565F5]/40 hover:shadow-[0_0_30px_rgba(149,101,245,0.1)]",
  },
  {
    title: "Best Result Selection",
    desc: "Neura evaluates generated outputs for quality, accuracy, and cinematic value, then surfaces the strongest result.",
    icon: CheckCircle2,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-400/10",
    iconBorder: "border-amber-400/30",
    badge: "91/100",
    badgeColor: "text-amber-400 bg-amber-400/10 border-amber-400/25",
    hoverGlow: "hover:border-amber-400/40 hover:shadow-[0_0_30px_rgba(251,191,36,0.1)]",
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="relative py-28 overflow-hidden neura-grid border-t border-[#1B2635]/40"
      aria-labelledby="features-heading"
    >
      {/* Orbital technical diagram on the left matching Screenshot 2 */}
      <div className="absolute top-10 left-2 lg:left-12 w-80 h-80 pointer-events-none" aria-hidden="true">
        <svg viewBox="0 0 300 300" className="w-full h-full opacity-20" fill="none">
          <circle cx="120" cy="120" r="100" stroke="#00D4E8" strokeWidth="0.8" strokeDasharray="3 6" />
          <circle cx="120" cy="120" r="60" stroke="#9565F5" strokeWidth="0.6" />
          <line x1="20" y1="120" x2="220" y2="120" stroke="#1B2635" strokeWidth="1" />
          <line x1="120" y1="20" x2="120" y2="220" stroke="#1B2635" strokeWidth="1" />
          <text x="30" y="45" fill="#9AA8BC" fontSize="9" fontFamily="monospace">
            ROT: 180° // RAD: 1.618
          </text>
          <text x="125" y="115" fill="#00D4E8" fontSize="8" fontFamily="monospace">
            +
          </text>
        </svg>
      </div>

      <div className="container px-4 md:px-8 mx-auto max-w-6xl relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#9565F5]/30 bg-[#9565F5]/5 px-3.5 py-1 text-[11px] text-[#9565F5] font-mono uppercase tracking-widest mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#9565F5] shadow-[0_0_6px_rgba(149,101,245,0.8)]" />
            <span>01 // WHAT NEURA DOES</span>
          </div>

          <h2
            id="features-heading"
            className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-5 text-[#F5F7FC]"
          >
            Unprecedented{" "}
            <span className="gradient-violet-blue">Control.</span>
          </h2>

          <p className="text-sm md:text-base text-[#9AA8BC] max-w-xl mx-auto leading-relaxed">
            A production-grade pipeline designed to give you{" "}
            <strong className="text-[#F5F7FC] font-semibold">full creative agency</strong> and{" "}
            <strong className="text-[#F5F7FC] font-semibold">AI automation</strong> in equal measure.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className={`relative rounded-2xl border border-[#1B2635] bg-[#0B101C]/80 backdrop-blur-sm p-6 flex flex-col justify-between transition-all duration-300 ${feat.hoverGlow}`}
              >
                <div>
                  {/* Top row: Icon + Badge */}
                  <div className="flex items-center justify-between mb-6">
                    <div className={`w-12 h-12 rounded-xl border ${feat.iconBorder} ${feat.iconBg} flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${feat.iconColor}`} />
                    </div>
                    <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full border ${feat.badgeColor}`}>
                      {feat.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-[#F5F7FC] mb-2.5">
                    {feat.title}
                  </h3>

                  <p className="text-xs text-[#9AA8BC] leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
