"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[#1B2635] bg-[#050810] text-[#9AA8BC] relative z-20">
      <div className="container mx-auto px-4 py-16 md:px-8 max-w-6xl">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
          {/* Column 1 — Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#00D4E8]/10 border border-[#00D4E8]/30 text-[#00D4E8]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07l14.14-14.14" />
                </svg>
              </div>
              <span className="text-base font-bold tracking-[0.14em] text-[#F5F7FC] uppercase">
                NEURA
              </span>
            </Link>
            <p className="text-xs text-[#9AA8BC] leading-relaxed max-w-xs">
              AI-Powered Cinematic Educational Video Generation Platform. Turn ideas into structured blueprints with multi-model rendering.
            </p>
            <p className="text-[11px] font-mono text-[#9AA8BC]/70 pt-2">
              © {new Date().getFullYear()} Neura Inc. All rights reserved.
            </p>
          </div>

          {/* Column 2 — Product */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#F5F7FC]">
              Product
            </h4>
            <nav className="flex flex-col gap-2.5 text-xs">
              <Link href="/#features" className="hover:text-[#00D4E8] transition-colors">Features</Link>
              <Link href="/#how-it-works" className="hover:text-[#00D4E8] transition-colors">How It Works</Link>
              <Link href="/#examples" className="hover:text-[#00D4E8] transition-colors">Examples</Link>
              <Link href="/create" className="hover:text-[#00D4E8] transition-colors text-[#00D4E8]">Create Video</Link>
            </nav>
          </div>

          {/* Column 3 — Platform */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#F5F7FC]">
              Platform
            </h4>
            <nav className="flex flex-col gap-2.5 text-xs">
              <Link href="/projects" className="hover:text-[#00D4E8] transition-colors">My Projects</Link>
              <Link href="/login" className="hover:text-[#00D4E8] transition-colors">Sign In</Link>
              <Link href="/signup" className="hover:text-[#00D4E8] transition-colors">Sign Up</Link>
            </nav>
          </div>

          {/* Column 4 — Resources */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#F5F7FC]">
              Resources
            </h4>
            <nav className="flex flex-col gap-2.5 text-xs">
              <Link href="/#capabilities" className="hover:text-[#00D4E8] transition-colors">Documentation</Link>
              <Link href="/#capabilities" className="hover:text-[#00D4E8] transition-colors">API Reference</Link>
              <a href="mailto:support@neura.ai" className="hover:text-[#00D4E8] transition-colors">Contact</a>
            </nav>
          </div>
        </div>

        {/* Bottom divider and links */}
        <div className="mt-12 pt-8 border-t border-[#1B2635] flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#9AA8BC]/70 font-mono">
          <div className="flex items-center gap-4">
            <span>Powered by Pixazo LTX 2.5 &amp; OpenRouter</span>
          </div>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-[#F5F7FC] transition-colors">Privacy Policy</Link>
            <Link href="/" className="hover:text-[#F5F7FC] transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
