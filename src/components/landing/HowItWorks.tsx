"use client";

const PHASES = [
  {
    num: "01",
    status: "Analyzing...",
    title: "Describe Your Idea",
    desc: "Start with a topic, question, or concept — no technical knowledge required.",
    tip: "Type naturally. Neura interprets your intent.",
    side: "left",
    color: "#FF9B25",
    glow: "rgba(255, 155, 37, 0.4)",
  },
  {
    num: "02",
    status: "Structuring...",
    title: "Shape the Lesson",
    desc: "Turn your idea into a structured educational plan and a detailed visual prompt.",
    tip: "Review, edit, and refine before committing to generation.",
    side: "right",
    color: "#FF6B6B",
    glow: "rgba(255, 107, 107, 0.4)",
  },
  {
    num: "03",
    status: "Rendering...",
    title: "Bring It to Life",
    desc: "Generate a cinematic visual learning experience using a supported video-generation provider.",
    tip: "Compare multiple outputs and select the strongest result.",
    side: "left",
    color: "#9565F5",
    glow: "rgba(149, 101, 245, 0.4)",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative py-28 overflow-hidden neura-grid border-t border-[#1B2635]/40"
      aria-labelledby="how-heading"
    >
      {/* Orbital Triangle Diagram (Top Right) matching screenshots 3 & 4 */}
      <div className="absolute top-12 right-4 lg:right-20 w-72 h-72 pointer-events-none" aria-hidden="true">
        <svg viewBox="0 0 260 260" className="w-full h-full opacity-25" fill="none">
          <circle cx="130" cy="130" r="110" stroke="#FF9B25" strokeWidth="0.8" strokeDasharray="3 6" />
          <polygon points="130,25 225,190 35,190" stroke="#FF9B25" strokeWidth="1" fill="none" opacity="0.6" />
          <circle cx="130" cy="25" r="4" fill="#00D4E8" />
          <circle cx="225" cy="190" r="4" fill="#FF9B25" />
          <circle cx="35" cy="190" r="4" fill="#9565F5" />
          <text x="135" y="20" fill="#9AA8BC" fontSize="9" fontFamily="monospace">P.01</text>
          <text x="230" y="195" fill="#9AA8BC" fontSize="9" fontFamily="monospace">P.02</text>
          <text x="12" y="195" fill="#9AA8BC" fontSize="9" fontFamily="monospace">P.03</text>
        </svg>
      </div>

      <div className="container px-4 md:px-8 mx-auto max-w-5xl relative z-10">
        {/* Header */}
        <div className="text-center mb-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#FF9B25]/30 bg-[#FF9B25]/5 px-3.5 py-1 text-[11px] text-[#FF9B25] font-mono uppercase tracking-widest mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF9B25] shadow-[0_0_6px_rgba(255,155,37,0.8)]" />
            <span>02 // HOW NEURA WORKS</span>
          </div>

          <h2
            id="how-heading"
            className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-5 text-[#F5F7FC]"
          >
            How{" "}
            <span className="gradient-orange-pink-blue">Neura Works.</span>
          </h2>

          <p className="text-sm md:text-base text-[#9AA8BC] max-w-xl mx-auto leading-relaxed">
            From natural thought to finished cinematic video in{" "}
            <strong className="text-[#F5F7FC] font-semibold">three transparent steps</strong> with full human-in-the-loop oversight.
          </p>
        </div>

        {/* Central Vertical Timeline */}
        <div className="relative">
          {/* Continuous Vertical Glowing Line */}
          <div
            className="absolute left-1/2 -translate-x-1/2 top-4 bottom-4 w-px bg-gradient-to-b from-[#FF9B25] via-[#FF6B6B] to-[#9565F5] opacity-60 hidden md:block"
            aria-hidden="true"
          />

          <div className="space-y-16 md:space-y-24">
            {PHASES.map((phase) => {
              const isLeft = phase.side === "left";
              return (
                <div
                  key={phase.num}
                  className="relative flex flex-col md:flex-row items-center"
                >
                  {/* Left Column / Card */}
                  <div className={`w-full md:w-1/2 ${isLeft ? "md:pr-12 lg:pr-16" : "hidden md:block"}`}>
                    {isLeft && (
                      <div className="rounded-2xl border border-[#1B2635] bg-[#0B101C]/90 backdrop-blur-md p-6 sm:p-7 shadow-[0_4px_30px_rgba(0,0,0,0.5)] transition-all duration-300 hover:border-[#FF9B25]/40">
                        <div className="flex items-center justify-between mb-3 text-[10px] font-mono uppercase tracking-wider">
                          <span style={{ color: phase.color }} className="font-semibold">
                            PHASE {phase.num}
                          </span>
                          <span style={{ color: phase.color }} className="opacity-80">
                            {phase.status}
                          </span>
                        </div>

                        <h3 className="text-xl font-bold text-[#F5F7FC] mb-2.5">
                          {phase.title}
                        </h3>

                        <p className="text-xs sm:text-sm text-[#9AA8BC] leading-relaxed mb-4">
                          {phase.desc}
                        </p>

                        <div className="text-xs font-medium" style={{ color: phase.color }}>
                          {phase.tip}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Center Circular Node Marker */}
                  <div className="my-4 md:my-0 flex-shrink-0 z-20">
                    <div
                      className="w-14 h-14 rounded-full border-2 bg-[#050810] flex items-center justify-center font-mono font-bold text-sm tracking-widest shadow-lg transition-transform duration-300 hover:scale-110"
                      style={{
                        borderColor: phase.color,
                        color: phase.color,
                        boxShadow: `0 0 25px ${phase.glow}`,
                      }}
                    >
                      {phase.num}
                    </div>
                  </div>

                  {/* Right Column / Card */}
                  <div className={`w-full md:w-1/2 ${!isLeft ? "md:pl-12 lg:pl-16" : "hidden md:block"}`}>
                    {!isLeft && (
                      <div className="rounded-2xl border border-[#1B2635] bg-[#0B101C]/90 backdrop-blur-md p-6 sm:p-7 shadow-[0_4px_30px_rgba(0,0,0,0.5)] transition-all duration-300 hover:border-[#FF6B6B]/40">
                        <div className="flex items-center justify-between mb-3 text-[10px] font-mono uppercase tracking-wider">
                          <span style={{ color: phase.color }} className="font-semibold">
                            PHASE {phase.num}
                          </span>
                          <span style={{ color: phase.color }} className="opacity-80">
                            {phase.status}
                          </span>
                        </div>

                        <h3 className="text-xl font-bold text-[#F5F7FC] mb-2.5">
                          {phase.title}
                        </h3>

                        <p className="text-xs sm:text-sm text-[#9AA8BC] leading-relaxed mb-4">
                          {phase.desc}
                        </p>

                        <div className="text-xs font-medium" style={{ color: phase.color }}>
                          {phase.tip}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
