"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Check,
  Zap,
  Film,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Clock,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function PricingPage() {
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleJoinWaitlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail || !waitlistEmail.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    setErrorMsg(null);
    setIsSubmitted(true);
    if (typeof window !== "undefined") {
      try {
        const existing = JSON.parse(localStorage.getItem("neura_pro_waitlist") || "[]");
        existing.push({ email: waitlistEmail, joinedAt: new Date().toISOString() });
        localStorage.setItem("neura_pro_waitlist", JSON.stringify(existing));
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-[#050810] text-[#F5F7FC] relative overflow-hidden pb-20 pt-8 font-sans">
      {/* Background ambient lighting & grid */}
      <div className="absolute inset-0 neura-grid-dark opacity-15 pointer-events-none" />
      <div className="aurora-bg" aria-hidden="true" />

      <div className="container mx-auto px-4 md:px-8 max-w-5xl relative z-10">
        {/* Navigation Breadcrumb */}
        <div className="mb-8">
          <Link
            href="/create"
            className="inline-flex items-center gap-1.5 text-xs text-[#9AA8BC] hover:text-[#00D4E8] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Return to Studio
          </Link>
        </div>

        {/* Hero Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[#00D4E8]/30 bg-[#00D4E8]/10 text-[#00D4E8] text-xs font-mono uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5 text-[#00D4E8]" />
            <span>NEURA CAPACITY &amp; PLANS</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            Supercharge Your <span className="gradient-cyan-teal">Learning Engine</span>
          </h1>
          <p className="text-sm md:text-base text-[#9AA8BC] leading-relaxed">
            Choose the plan that fits your educational journey. Access dedicated GPU rendering capacity, expansive video generation quotas, and comprehensive study materials.
          </p>
        </div>

        {/* Comparison Tier Grid */}
        <div className="grid md:grid-cols-2 gap-8 items-stretch max-w-4xl mx-auto mb-16">
          {/* Free / Standard Plan */}
          <div className="rounded-2xl border border-white/10 bg-[#0B1020]/90 backdrop-blur-xl p-8 flex flex-col justify-between shadow-xl relative">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono uppercase tracking-wider text-[#9AA8BC]">Current Tier</span>
                <Badge variant="outline" className="border-white/20 text-[#9AA8BC] font-mono text-xs">
                  Active Sandbox
                </Badge>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Standard Plan</h2>
              <p className="text-xs text-[#9AA8BC] mb-6 leading-relaxed">
                Ideal for exploratory topic research, lesson outlining, and curated visual stream viewing.
              </p>

              <div className="pb-6 mb-6 border-b border-white/10">
                <div className="flex items-baseline gap-1 text-3xl font-extrabold text-white">
                  <span>Free</span>
                  <span className="text-xs text-[#9AA8BC] font-normal">/ exploration tier</span>
                </div>
              </div>

              <div className="space-y-3.5 text-xs text-slate-300">
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#00D4E8] shrink-0" />
                  <span>Educational blueprint &amp; master-prompt creation</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#00D4E8] shrink-0" />
                  <span>Curated library access for verified subjects</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#00D4E8] shrink-0" />
                  <span>Interactive study notes &amp; knowledge checks</span>
                </div>
                <div className="flex items-center gap-2.5 text-[#9AA8BC]">
                  <Clock className="w-4 h-4 text-[#9AA8BC] shrink-0" />
                  <span>Standard serverless GPU generation capacity</span>
                </div>
              </div>
            </div>

            <div className="pt-8 mt-6 border-t border-white/10">
              <Link href="/create" className="block">
                <Button
                  variant="outline"
                  className="w-full h-11 border-white/20 hover:bg-white/10 text-white font-medium text-xs"
                >
                  Create with Standard Tier
                </Button>
              </Link>
            </div>
          </div>

          {/* Pro Plan (Coming Soon) */}
          <div className="rounded-2xl border-2 border-[#00D4E8]/50 bg-gradient-to-b from-[#0B1528] to-[#070D18] backdrop-blur-xl p-8 flex flex-col justify-between shadow-[0_0_40px_rgba(0,212,232,0.15)] relative">
            <div className="absolute -top-3.5 right-6">
              <Badge className="bg-gradient-to-r from-[#00D4E8] to-[#9565F5] text-slate-950 font-bold text-[10px] tracking-wider uppercase px-3 py-1 shadow-lg">
                COMING SOON
              </Badge>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-[#00D4E8]" />
                <span className="text-xs font-mono uppercase tracking-wider text-[#00D4E8] font-semibold">
                  Maximum Performance
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">NEURA Pro</h2>
              <p className="text-xs text-[#9AA8BC] mb-6 leading-relaxed">
                Dedicated high-throughput GPU capacity for continuous cinematic 3D video generation.
              </p>

              <div className="pb-6 mb-6 border-b border-white/10">
                <div className="flex items-baseline gap-1 text-2xl font-extrabold text-white">
                  <span className="gradient-cyan-teal">Pricing Announced at Launch</span>
                </div>
                <div className="text-[11px] text-[#9AA8BC] mt-1">
                  Plan pricing and tier details will be confirmed upon billing system release.
                </div>
              </div>

              <div className="space-y-3.5 text-xs text-slate-200">
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#00D4E8] shrink-0" />
                  <span className="font-semibold text-white">Expanded Video Generation Limit</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#00D4E8] shrink-0" />
                  <span>Dedicated GPU inference queue prioritization</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#00D4E8] shrink-0" />
                  <span>High-definition 1080p 3D video synthesis</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#00D4E8] shrink-0" />
                  <span>Full access to complete private educational catalog</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#00D4E8] shrink-0" />
                  <span>Exportable study packs &amp; advanced quiz choreography</span>
                </div>
              </div>
            </div>

            <div className="pt-8 mt-6 border-t border-white/10">
              {isSubmitted ? (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold text-center flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" /> You&apos;re on the Pro Priority Waitlist!
                </div>
              ) : (
                <form onSubmit={handleJoinWaitlist} className="space-y-2.5">
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={waitlistEmail}
                      onChange={(e) => setWaitlistEmail(e.target.value)}
                      className="bg-black/40 border-white/15 text-xs h-11 text-white placeholder:text-slate-500 focus-visible:ring-[#00D4E8]"
                    />
                    <Button
                      type="submit"
                      className="h-11 px-5 text-xs font-bold bg-gradient-to-r from-[#00D4E8] to-[#00B4C8] hover:opacity-90 text-slate-950 shadow-[0_0_20px_rgba(0,212,232,0.3)] shrink-0"
                    >
                      Join Waitlist
                    </Button>
                  </div>
                  {errorMsg && (
                    <p className="text-[11px] text-rose-400 pl-1">{errorMsg}</p>
                  )}
                  <p className="text-[10px] text-[#9AA8BC] text-center">
                    No payment details required. We will notify you when Pro is live.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Transparent Compliance & Security Notice */}
        <div className="max-w-4xl mx-auto rounded-xl border border-white/10 bg-[#0B1020]/60 p-5 flex items-start gap-4">
          <ShieldCheck className="w-6 h-6 text-[#00D4E8] shrink-0 mt-0.5" />
          <div className="text-xs text-[#9AA8BC] leading-relaxed space-y-1">
            <p className="font-semibold text-white">Billing &amp; Subscription Disclosure</p>
            <p>
              Subscription billing is currently in development. Pro privileges, additional quotas, and payment transactions are strictly verified and managed server-side. No client-side actions grant paid privileges or charge payment methods without server-confirmed verification.
            </p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="flex justify-center gap-6 mt-12 text-xs text-[#9AA8BC]">
          <Link href="/library" className="hover:text-white flex items-center gap-1 transition-colors">
            <Film className="w-3.5 h-3.5 text-[#00D4E8]" /> Explore Free Library Videos
          </Link>
          <span className="text-white/20">•</span>
          <Link href="/create" className="hover:text-white flex items-center gap-1 transition-colors">
            <BookOpen className="w-3.5 h-3.5 text-[#9565F5]" /> Create Educational Blueprint
          </Link>
        </div>
      </div>
    </div>
  );
}
