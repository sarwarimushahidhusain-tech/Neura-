"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";

export function Footer() {
  const pathname = usePathname();
  const isAuth = pathname === "/login" || pathname === "/signup";

  return (
    <footer className={`border-t transition-colors duration-300 ${
      isAuth
        ? "border-[#0FA4AF]/15 bg-[#071D20] text-[#A7C4C6]"
        : "border-border/40 bg-background text-muted-foreground"
    }`}>
      <div className="container mx-auto px-4 py-12 md:px-8">
        <div className="grid gap-8 md:grid-cols-4 lg:gap-12">
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <Sparkles className={`h-5 w-5 ${isAuth ? "text-[#0FA4AF]" : "text-primary"}`} />
              <span className={`text-xl font-bold tracking-tight ${isAuth ? "text-[#EAF6F6]" : "text-foreground"}`}>NEURA</span>
            </Link>
            <p className={`text-sm max-w-sm ${isAuth ? "text-[#A7C4C6]" : "text-muted-foreground"}`}>
              AI-Powered 3D Video Generation Platform. Turn your ideas into intelligent, educational visual stories with cinematic precision.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className={`text-sm font-semibold tracking-tight ${isAuth ? "text-[#EAF6F6]" : "text-foreground"}`}>Product</h4>
            <nav className={`flex flex-col gap-2 text-sm ${isAuth ? "text-[#A7C4C6]" : "text-muted-foreground"}`}>
              <Link href="/library" className="hover:text-foreground transition-colors">3D Video Library</Link>
              <Link href="/" className="hover:text-foreground transition-colors">How It Works</Link>
              <Link href="/" className="hover:text-foreground transition-colors">Features</Link>
              <Link href="/projects" className="hover:text-foreground transition-colors">Examples</Link>
              <Link href="/login" className="hover:text-[#0FA4AF] transition-colors">Studio Sign In</Link>
            </nav>
          </div>

          <div className="space-y-4">
            <h4 className={`text-sm font-semibold tracking-tight ${isAuth ? "text-[#EAF6F6]" : "text-foreground"}`}>Resources</h4>
            <nav className={`flex flex-col gap-2 text-sm ${isAuth ? "text-[#A7C4C6]" : "text-muted-foreground"}`}>
              <Link href="/" className="hover:text-foreground transition-colors">Documentation</Link>
              <Link href="/" className="hover:text-foreground transition-colors">API References</Link>
              <Link href="/signup" className="hover:text-[#0FA4AF] transition-colors">Get Started Free</Link>
            </nav>
          </div>
        </div>

        <div className={`mt-12 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4 text-xs ${
          isAuth ? "border-[#0FA4AF]/15 text-[#A7C4C6]/70" : "border-border/40 text-muted-foreground"
        }`}>
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
