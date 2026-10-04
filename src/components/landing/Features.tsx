"use client";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BrainCircuit, PenLine, Layers, CheckCircle, ArrowRight } from "lucide-react";

const FEATURES = [
  {
    title: "AI Scene Planning",
    description: "Turn a simple idea into a structured visual story with intelligent automated storyboarding.",
    icon: BrainCircuit,
    delay: "delay-100",
    color: "text-[#2563EB]", // Electric Blue
    bg: "bg-[#2563EB]/10",
    hoverBg: "group-hover:bg-[#2563EB]/20",
    border: "hover:border-[#2563EB]/40",
  },
  {
    title: "Editable Master Prompt",
    description: "See exactly what Neura will send to video models and modify it yourself for complete creative control.",
    icon: PenLine,
    delay: "delay-200",
    color: "text-[#7C3AED]", // Violet
    bg: "bg-[#7C3AED]/10",
    hoverBg: "group-hover:bg-[#7C3AED]/20",
    border: "hover:border-[#7C3AED]/40",
  },
  {
    title: "Multi-Model Generation",
    description: "Generate multiple versions simultaneously using LTX, HunyuanVideo, and CogVideoX in parallel.",
    icon: Layers,
    delay: "delay-300",
    color: "text-[#4F46E5]", // Indigo
    bg: "bg-[#4F46E5]/10",
    hoverBg: "group-hover:bg-[#4F46E5]/20",
    border: "hover:border-[#4F46E5]/40",
  },
  {
    title: "Best Result Selection",
    description: "Neura evaluates generated outputs intelligently and selects the strongest cinematic result.",
    icon: CheckCircle,
    delay: "delay-400",
    color: "text-[#0EA5A4]", // Mint
    bg: "bg-[#0EA5A4]/10",
    hoverBg: "group-hover:bg-[#0EA5A4]/20",
    border: "hover:border-[#0EA5A4]/40",
  },
];

export function Features() {
  return (
    <section className="py-24 bg-background">
      <div className="container px-4 md:px-8 mx-auto max-w-6xl">
        <div className="text-center mb-16 reveal-on-scroll">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-foreground">
            Unprecedented Control
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            A production-grade pipeline designed to give you AI automation and full creative agency.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className={`
                  reveal-on-scroll ${feature.delay}
                  card-lift group relative overflow-hidden
                  bg-card border-border shadow-sm
                  ${feature.border}
                  cursor-default
                `}
              >
                {/* Subtle Aurora Glow on Hover */}
                <div className="absolute -inset-4 bg-gradient-to-br from-transparent to-black/5 opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-2xl pointer-events-none" />

                <CardHeader className="p-6 relative z-10">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-colors duration-300 ${feature.bg} ${feature.hoverBg}`}>
                    <Icon className={`h-6 w-6 ${feature.color} group-hover:scale-110 transition-transform duration-300`} />
                  </div>
                  <CardTitle className="text-base font-semibold mb-2 text-foreground">
                    {feature.title}
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </CardDescription>
                  <div className={`mt-4 flex items-center gap-1 text-xs font-semibold ${feature.color} opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-[-10px] group-hover:translate-x-0`}>
                    Learn more <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
