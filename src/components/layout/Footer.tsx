import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-background">
      <div className="container mx-auto px-4 py-12 md:px-8">
        <div className="grid gap-8 md:grid-cols-4 lg:gap-12">
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-xl font-bold tracking-tight">NEURA</span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-sm">
              AI-Powered 3D Video Generation Platform. Turn your ideas into intelligent, educational visual stories with cinematic precision.
            </p>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-sm font-semibold tracking-tight">Product</h4>
            <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors">How It Works</Link>
              <Link href="/" className="hover:text-foreground transition-colors">Features</Link>
              <Link href="/projects" className="hover:text-foreground transition-colors">Examples</Link>
            </nav>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold tracking-tight">Resources</h4>
            <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors">Documentation</Link>
              <Link href="/" className="hover:text-foreground transition-colors">API References</Link>
              <Link href="/" className="hover:text-foreground transition-colors">Contact</Link>
            </nav>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Neura. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/" className="hover:text-foreground">Privacy</Link>
            <Link href="/" className="hover:text-foreground">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
