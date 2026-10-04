import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function Cta() {
  return (
    <section className="py-32 relative overflow-hidden bg-background">
      {/* Aurora glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/10 blur-[100px] rounded-full" />
      </div>

      <div className="container relative z-10 mx-auto px-4 md:px-8 text-center max-w-3xl reveal-on-scroll">
        <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 text-foreground">
          Ready to turn your idea into a visual story?
        </h2>
        <p className="text-xl text-muted-foreground mb-10 max-w-xl mx-auto">
          Start generating cinematic educational videos today. No technical skills required.
        </p>

        <Link href="/create">
          <Button
            size="lg"
            className="h-14 px-10 text-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group"
          >
            Start Creating for Free
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
          </Button>
        </Link>
      </div>
    </section>
  );
}
