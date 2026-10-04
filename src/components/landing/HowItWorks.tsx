const STEPS = [
  { num: "01", title: "Enter Idea", desc: "Describe the educational or creative concept in plain language." },
  { num: "02", title: "AI Plans", desc: "Neura structures a scene-by-scene visual script automatically." },
  { num: "03", title: "Edit Master Prompt", desc: "You review and maintain full creative control before generation." },
  { num: "04", title: "Generate Multiple Videos", desc: "Parallel generation across LTX, HunyuanVideo, and CogVideoX." },
  { num: "05", title: "Select Best Result", desc: "Neura evaluates outputs and surfaces the strongest video." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-card border-y border-border relative overflow-hidden">
      {/* Subtle Aurora in background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/5 blur-[120px] rounded-full" />
      </div>

      <div className="container mx-auto px-4 md:px-8 max-w-4xl relative z-10">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-center mb-16 reveal-on-scroll text-foreground">
          How It Works
        </h2>

        <div className="relative">
          {/* Vertical line with signal */}
          <div className="absolute left-[23px] md:left-1/2 top-4 bottom-4 w-px bg-border md:-translate-x-px" aria-hidden="true">
             <div className="absolute top-0 w-px h-32 bg-gradient-to-b from-transparent via-primary to-transparent animate-flow-down opacity-50" />
          </div>

          <ol className="space-y-12">
            {STEPS.map((step, i) => (
              <li
                key={step.num}
                className={`reveal-on-scroll delay-${(i + 1) * 100} relative flex gap-6 md:gap-0 ${
                  i % 2 === 0
                    ? "md:flex-row"
                    : "md:flex-row-reverse"
                }`}
              >
                {/* Step number node */}
                <div className="relative z-10 flex-shrink-0 flex md:absolute md:left-1/2 md:-translate-x-1/2 md:top-1/2 md:-translate-y-1/2">
                  <div className="h-12 w-12 rounded-full bg-background border-2 border-background shadow-md flex items-center justify-center text-sm font-mono font-bold text-primary group-hover:scale-110 transition-transform">
                    {step.num}
                  </div>
                </div>

                {/* Content */}
                <div
                  className={`flex-1 md:w-[45%] md:flex-none md:max-w-[45%] ${
                    i % 2 === 0
                      ? "md:pr-16 text-left md:text-right"
                      : "md:pl-16 md:ml-auto text-left"
                  }`}
                >
                  <div className="p-6 rounded-2xl bg-background/50 backdrop-blur-sm border border-border shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                    <h3 className="text-lg font-bold mb-2 text-foreground">{step.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </div>

                {/* Spacer for alternate side */}
                <div className="hidden md:block md:w-[45%] md:flex-none md:max-w-[45%]" aria-hidden="true" />
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
