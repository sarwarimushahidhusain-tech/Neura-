"use client";

import { useEffect, useState } from "react";

const STAGES = [
  "User Idea",
  "AI Plan",
  "Master Prompt",
  "Multi-Model Gen",
  "Evaluation",
  "Best Result"
];

export function NeuralRibbon({ activeIndex = -1 }: { activeIndex?: number }) {
  const [internalActive, setInternalActive] = useState(0);

  useEffect(() => {
    if (activeIndex >= 0) {
      return;
    }
    const interval = setInterval(() => {
      setInternalActive((n) => (n + 1) % STAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [activeIndex]);

  const active = activeIndex >= 0 ? activeIndex : internalActive;

  return (
    <div className="w-full flex flex-col md:flex-row items-center justify-between relative py-6">
      {/* Background track */}
      <div className="absolute left-1/2 top-4 bottom-4 w-px bg-border md:w-full md:h-px md:left-0 md:top-1/2 md:-translate-y-1/2 -z-10" />

      {/* Signal */}
      <div
        className="absolute w-1 h-12 md:w-24 md:h-1 bg-gradient-to-b md:bg-gradient-to-r from-transparent via-primary to-transparent blur-sm -z-10 transition-all duration-1000 ease-in-out left-1/2 top-[var(--signal-pos)] md:left-[var(--signal-pos)] md:top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          "--signal-pos": `${(active / (STAGES.length - 1)) * 100}%`,
        } as React.CSSProperties}
      />

      {STAGES.map((stage, i) => {
        const isActive = active === i;
        const isPast = active > i;

        return (
          <div key={stage} className="flex md:flex-col items-center gap-4 md:gap-3 z-10 w-full md:w-auto my-3 md:my-0">
            <div
              className={`flex items-center justify-center h-8 w-8 rounded-full border transition-all duration-500 ${
                isActive
                  ? "bg-primary border-primary text-primary-foreground shadow-[0_0_15px_rgba(79,70,229,0.4)]"
                  : isPast
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-card border-border text-muted-foreground"
              }`}
            >
              <div className={`h-2 w-2 rounded-full ${isActive ? 'bg-white animate-pulse' : isPast ? 'bg-primary' : 'bg-transparent'}`} />
            </div>
            <div className={`text-xs font-semibold whitespace-nowrap transition-colors duration-300 ${
              isActive ? "text-primary" : "text-muted-foreground"
            }`}>
              {stage}
            </div>
          </div>
        );
      })}
    </div>
  );
}
