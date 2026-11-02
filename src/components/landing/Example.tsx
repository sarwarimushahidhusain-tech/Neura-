"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";

interface ExampleCard {
  id: string;
  badge: string;
  badgeColor: string;
  badgeBorder: string;
  title: string;
  subject: string;
  desc: string;
  topic: string;
  previewType: "cosmos" | "physics" | "biology";
}

const EXAMPLES: ExampleCard[] = [
  {
    id: "cosmos",
    badge: "01 - Astronomy",
    badgeColor: "text-[#00D4E8] bg-[#00D4E8]/10",
    badgeBorder: "border-[#00D4E8]/30",
    title: "The Cosmos",
    subject: "Astronomy",
    desc: "A cinematic journey through our solar system, orbital mechanics, planetary scale, and deep space.",
    topic: "The Solar System and Planetary Orbital Mechanics",
    previewType: "cosmos",
  },
  {
    id: "physics",
    badge: "02 - Physics",
    badgeColor: "text-[#00C9B7] bg-[#00C9B7]/10",
    badgeBorder: "border-[#00C9B7]/30",
    title: "The Invisible Forces",
    subject: "Physics",
    desc: "Explore the laws that govern motion through clear scientific demonstrations and vector visualizations.",
    topic: "Newton's Laws of Motion with 3D Vectors",
    previewType: "physics",
  },
  {
    id: "biology",
    badge: "03 - Biology",
    badgeColor: "text-[#FF6B6B] bg-[#FF6B6B]/10",
    badgeBorder: "border-[#FF6B6B]/30",
    title: "Inside the Human Body",
    subject: "Biology",
    desc: "Explore the human circulatory system, heart chambers, valves, and the fluid dynamics of blood.",
    topic: "Human Circulatory System and Cardiac Chambers",
    previewType: "biology",
  },
];

function CardGraphic({ type }: { type: ExampleCard["previewType"] }) {
  if (type === "cosmos") {
    return (
      <div className="relative w-full h-44 rounded-xl overflow-hidden bg-gradient-to-b from-[#050B18] to-[#0B1426] flex items-center justify-center border border-[#1B2635]">
        <svg viewBox="0 0 280 180" className="w-full h-full" fill="none">
          {/* Deep space stars */}
          <circle cx="40" cy="30" r="1" fill="#fff" opacity="0.6" />
          <circle cx="90" cy="70" r="1.5" fill="#00D4E8" opacity="0.8" />
          <circle cx="210" cy="40" r="1" fill="#fff" opacity="0.5" />
          <circle cx="240" cy="110" r="1" fill="#fff" opacity="0.7" />
          <circle cx="50" cy="130" r="0.8" fill="#fff" opacity="0.4" />
          {/* Planet sphere */}
          <defs>
            <radialGradient id="planetGrad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#2A64A8" />
              <stop offset="50%" stopColor="#122A56" />
              <stop offset="100%" stopColor="#081022" />
            </radialGradient>
            <radialGradient id="planetGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00D4E8" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#00D4E8" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="125" cy="95" r="54" fill="url(#planetGlow)" />
          <circle cx="125" cy="95" r="46" fill="url(#planetGrad)" />
          {/* Planetary rings */}
          <ellipse cx="125" cy="95" rx="72" ry="14" stroke="#00D4E8" strokeWidth="1" strokeDasharray="4 2" opacity="0.4" transform="rotate(-12 125 95)" />
          {/* Orbiting moon */}
          <circle cx="195" cy="78" r="9" fill="#9AA8BC" opacity="0.85" />
          <circle cx="193" cy="76" r="3" fill="#fff" opacity="0.3" />
        </svg>
        <span className="absolute bottom-2 right-3 text-[9px] font-mono text-[#9AA8BC]/70 uppercase">
          Illustrative preview
        </span>
      </div>
    );
  }

  if (type === "physics") {
    return (
      <div className="relative w-full h-44 rounded-xl overflow-hidden bg-gradient-to-b from-[#061019] to-[#0A1A22] flex items-center justify-center border border-[#1B2635]">
        <svg viewBox="0 0 280 180" className="w-full h-full" fill="none">
          {/* Parabolic arc trajectory */}
          <path d="M 40 140 Q 140 40 240 140" stroke="#00C9B7" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.6" />
          {/* Vector particle */}
          <circle cx="140" cy="90" r="12" fill="#00C9B7" fillOpacity="0.15" stroke="#00C9B7" strokeWidth="1" />
          <circle cx="140" cy="90" r="3" fill="#00C9B7" />
          {/* Force Vectors */}
          <line x1="140" y1="90" x2="140" y2="135" stroke="#00C9B7" strokeWidth="1.5" />
          <polygon points="137,135 140,142 143,135" fill="#00C9B7" />
          <line x1="140" y1="90" x2="190" y2="90" stroke="#00C9B7" strokeWidth="1.5" />
          <polygon points="190,87 197,90 190,93" fill="#00C9B7" />
          {/* Axes */}
          <line x1="30" y1="150" x2="250" y2="150" stroke="#1B2635" strokeWidth="1" />
          <line x1="40" y1="20" x2="40" y2="155" stroke="#1B2635" strokeWidth="1" />
          <text x="135" y="78" fill="#00C9B7" fontSize="8" fontFamily="monospace">F_net</text>
        </svg>
        <span className="absolute bottom-2 right-3 text-[9px] font-mono text-[#9AA8BC]/70 uppercase">
          Illustrative preview
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-44 rounded-xl overflow-hidden bg-gradient-to-b from-[#18080A] to-[#250E12] flex items-center justify-center border border-[#1B2635]">
      <svg viewBox="0 0 280 180" className="w-full h-full" fill="none">
        <defs>
          <radialGradient id="bioGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FF4D4D" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#FF4D4D" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="140" cy="90" r="45" fill="url(#bioGlow)" />
        {/* Heart chamber silhouettes */}
        <path d="M 140 135 C 100 100 110 60 140 85 C 170 60 180 100 140 135 Z" fill="#991B1B" opacity="0.6" stroke="#EF4444" strokeWidth="1" />
        {/* Blood flow pulses */}
        <circle cx="130" cy="95" r="3" fill="#FF8080" />
        <circle cx="150" cy="95" r="3" fill="#60A5FA" />
        <path d="M 120 70 Q 140 50 160 70" stroke="#FF8080" strokeWidth="1" strokeDasharray="3 3" />
      </svg>
      <span className="absolute bottom-2 right-3 text-[9px] font-mono text-[#9AA8BC]/70 uppercase">
        Illustrative preview
      </span>
    </div>
  );
}

export function Example() {
  const router = useRouter();

  const handleUseTopic = (topic: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("neura_topic", topic);
    }
    router.push(`/create?topic=${encodeURIComponent(topic)}`);
  };

  return (
    <section
      id="examples"
      className="relative py-28 overflow-hidden neura-grid border-t border-[#1B2635]/40"
      aria-labelledby="examples-heading"
    >
      <div className="container px-4 md:px-8 mx-auto max-w-6xl relative z-10">

        {/* Large Outlined Feature Panel with Technical Corner Markers matching Screenshot 5 */}
        <div className="relative rounded-2xl border border-[#00D4E8]/20 bg-[#0B101C]/60 backdrop-blur-md p-8 sm:p-12 mb-12 text-center shadow-[0_0_40px_rgba(0,212,232,0.04)]">
          {/* Corner Markers */}
          <div className="absolute top-3 left-3 text-[10px] font-mono text-[#00D4E8] flex items-center gap-1.5 opacity-80">
            <span>┌</span>
            <span>REC 24.00FPS</span>
          </div>
          <div className="absolute top-3 right-3 text-[10px] font-mono text-[#9AA8BC] flex items-center gap-1.5 opacity-80">
            <span>OPTICAL RATIO: 16:9</span>
            <span>┐</span>
          </div>
          <div className="absolute bottom-3 left-3 text-[10px] font-mono text-[#9AA8BC] flex items-center gap-1.5 opacity-80">
            <span>└</span>
            <span>AI VIDEO ENGINE</span>
          </div>
          <div className="absolute bottom-3 right-3 text-[10px] font-mono text-[#9AA8BC] flex items-center gap-1.5 opacity-80">
            <span>STEREO</span>
            <span>┘</span>
          </div>

          {/* Section badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#00D4E8]/30 bg-[#00D4E8]/5 px-3.5 py-1 text-[11px] text-[#00D4E8] font-mono uppercase tracking-widest mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D4E8] shadow-[0_0_6px_rgba(0,212,232,0.8)]" />
            <span>03 // FEATURED EXAMPLES</span>
          </div>

          {/* Main Heading */}
          <h2
            id="examples-heading"
            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#F5F7FC] mb-4"
          >
            Complex Ideas.{" "}
            <span className="gradient-cyan-teal">Beautifully Explained.</span>
          </h2>

          <p className="text-sm md:text-base text-[#9AA8BC] max-w-2xl mx-auto leading-relaxed">
            Explore educational visualizations demonstrating <strong className="text-[#F5F7FC]">scientific depth</strong>, <strong className="text-[#00D4E8]">fluid motion</strong>, and cinematic lighting.
          </p>
        </div>

        {/* 3 Large Example Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {EXAMPLES.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-[#1B2635] bg-[#0B101C]/80 backdrop-blur-md p-5 flex flex-col justify-between transition-all duration-300 hover:border-[#00D4E8]/30 hover:shadow-[0_0_30px_rgba(0,212,232,0.08)] group"
            >
              <div>
                {/* Badge */}
                <div className="mb-4">
                  <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full border ${item.badgeColor} ${item.badgeBorder}`}>
                    {item.badge}
                  </span>
                </div>

                {/* Thumbnail graphic */}
                <div className="mb-5">
                  <CardGraphic type={item.previewType} />
                </div>

                {/* Title & Description */}
                <h3 className="text-lg font-bold text-[#F5F7FC] mb-2 group-hover:text-[#00D4E8] transition-colors duration-200">
                  {item.title}
                </h3>
                <p className="text-xs text-[#9AA8BC] leading-relaxed mb-4">
                  {item.desc}
                </p>
              </div>

              {/* Working "Try this topic" action */}
              <div className="pt-3 border-t border-[#1B2635]/60 flex items-center justify-between">
                <span className="text-[11px] text-[#9AA8BC] font-mono truncate max-w-[170px]" title={item.topic}>
                  &ldquo;{item.topic}&rdquo;
                </span>
                <button
                  type="button"
                  onClick={() => handleUseTopic(item.topic)}
                  className="flex items-center gap-1 text-xs font-semibold text-[#00D4E8] hover:text-[#00C9B7] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00D4E8] rounded px-1.5 py-1"
                >
                  Try this topic <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
