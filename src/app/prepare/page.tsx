"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  Check,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  Film,
  BookOpen,
  Search,
} from "lucide-react";
import type { LibraryVideo } from "@/types/library";

// ─── 4 Progressive Preparation Stages ───────────────────────────────────────
const PREP_STAGES = [
  {
    id: "understanding",
    title: "Understanding Your Topic",
    sub: "Analyzing core concepts, subject taxonomy, educational context and learning goals...",
    icon: "🧠",
    accent: "#00D4E8", // Cyan
    durationMs: 15000, // 15 s
  },
  {
    id: "structuring",
    title: "Structuring the Lesson",
    sub: "Organizing pedagogical breakdown, narrative flow, scene choreography and key takeaways...",
    icon: "📋",
    accent: "#9565F5", // Indigo / Violet
    durationMs: 15000, // 15 s
  },
  {
    id: "visuals",
    title: "Rendering Visual Learning Content",
    sub: "Generating cinematic 3D sequences, retrieving curated library match and encoding stream...",
    icon: "🎬",
    accent: "#C084FC", // Purple / Fuchsia
    durationMs: 18000, // 18 s (match API resolves in parallel)
  },
  {
    id: "finalizing",
    title: "Finalizing Your Learning Experience",
    sub: "Assembling authenticated video stream, interactive study notes and knowledge checks...",
    icon: "✨",
    accent: "#34D399", // Emerald
    durationMs: 12000, // 12 s
  },
];

// Exact background timer duration: 15 + 15 + 18 + 12 = 60,000 ms (1 minute)
const TARGET_BACKGROUND_DURATION_MS = 60000;

// Helper for orbiting particles
function OrbParticle({ accent, delay }: { accent: string; delay: number }) {
  return (
    <div
      className="orb-particle"
      style={{
        "--accent": accent,
        animationDelay: `${delay}s`,
      } as React.CSSProperties}
    />
  );
}

export default function PreparePage() {
  const router = useRouter();

  // ── State ──
  const [topic, setTopic] = useState("");
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [hasNoMatch, setHasNoMatch] = useState(false);
  const [alternatives, setAlternatives] = useState<LibraryVideo[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Background timer tracker (no countdown displayed to user)
  const startTimeRef = useRef<number>(0);

  // Prevent duplicate execution
  const executionStartedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Active stage
  const stage = PREP_STAGES[currentStageIdx];
  // Real stage progress percentage (25%, 50%, 75%, 100%)
  const progressPercent = isCompleted ? 100 : Math.round(((currentStageIdx + 1) / PREP_STAGES.length) * 100);

  // ── Main Orchestration ─────────────────────────────────────────────────────
  const startPreparation = useCallback(async () => {
    setErrorMessage(null);
    setHasNoMatch(false);
    setCurrentStageIdx(0);
    setIsCompleted(false);
    startTimeRef.current = Date.now();

    const savedTopic = typeof window !== "undefined"
      ? (localStorage.getItem("neura_topic") || "").trim()
      : "";
    const savedPrompt = typeof window !== "undefined"
      ? (localStorage.getItem("neura_master_prompt") || "").trim()
      : "";

    if (savedTopic) {
      setTopic(savedTopic);
    }

    // Safety timeout: 120 s (well above the 60 s background target)
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setErrorMessage("Preparation took longer than expected. Please check your connection or retry.");
    }, 120000);

    try {
      // ── Fire the API call IMMEDIATELY in the background so network time
      //    runs in parallel with the background preparation stages.
      const matchPromise = fetch("/api/library/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: savedTopic, masterPrompt: savedPrompt }),
      });

      // ── Stage 1: Understanding Your Topic (15 s)
      setCurrentStageIdx(0);
      await new Promise((resolve) => setTimeout(resolve, PREP_STAGES[0].durationMs));

      // ── Stage 2: Structuring the Lesson (15 s)
      setCurrentStageIdx(1);
      await new Promise((resolve) => setTimeout(resolve, PREP_STAGES[1].durationMs));

      // ── Stage 3: Rendering Visual Learning Content (18 s)
      //    Wait stage duration; API result resolved in parallel.
      setCurrentStageIdx(2);
      const [res] = await Promise.all([
        matchPromise,
        new Promise((resolve) => setTimeout(resolve, PREP_STAGES[2].durationMs)),
      ]);

      if (!res.ok) {
        throw new Error(`Unable to prepare visual content (Status ${res.status}).`);
      }

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Preparation failed.");
      }

      if (data.matched && data.video && data.video.video_url) {
        // Valid video match confirmed — store and advance to Stage 4
        localStorage.setItem("neura_video_url", data.video.video_url);
        localStorage.setItem("neura_library_video", JSON.stringify(data.video));
        localStorage.removeItem("neura_no_match");
        localStorage.removeItem("neura_alternatives");

        // ── Stage 4: Finalizing (12 s)
        setCurrentStageIdx(3);
        await new Promise((resolve) => setTimeout(resolve, PREP_STAGES[3].durationMs));

        // Enforce 1-minute background timer before launching video
        const elapsed = Date.now() - startTimeRef.current;
        const remainingTo60s = Math.max(0, TARGET_BACKGROUND_DURATION_MS - elapsed);
        if (remainingTo60s > 0) {
          await new Promise((resolve) => setTimeout(resolve, remainingTo60s));
        }

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsCompleted(true);

        // Transition to result page and run video
        setTimeout(() => { router.push("/result"); }, 500);
      } else {
        // Video not found in library: run full 1-minute background timer,
        // then route to /result with CREDITS_EXHAUSTED so user sees that
        // their credits are over and they have to take the Pro plan.
        setCurrentStageIdx(3);
        await new Promise((resolve) => setTimeout(resolve, PREP_STAGES[3].durationMs));

        const elapsed = Date.now() - startTimeRef.current;
        const remainingTo60s = Math.max(0, TARGET_BACKGROUND_DURATION_MS - elapsed);
        if (remainingTo60s > 0) {
          await new Promise((resolve) => setTimeout(resolve, remainingTo60s));
        }

        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        // Store credit exhaustion status
        localStorage.setItem("neura_generation_error_code", "CREDITS_EXHAUSTED");
        localStorage.removeItem("neura_video_url");
        localStorage.removeItem("neura_library_video");
        localStorage.removeItem("neura_no_match");
        localStorage.removeItem("neura_alternatives");

        setIsCompleted(true);
        setTimeout(() => {
          router.push("/result?errorCode=CREDITS_EXHAUSTED");
        }, 500);
      }
    } catch (err: unknown) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      const msg = err instanceof Error ? err.message : "An unexpected error occurred during preparation.";
      setErrorMessage(msg);
    }
  }, [router]);

  // Run on mount
  useEffect(() => {
    if (executionStartedRef.current) return;
    executionStartedRef.current = true;
    startPreparation();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [startPreparation]);

  // Restart handler
  const handleRetry = () => {
    executionStartedRef.current = false;
    startPreparation();
  };

  // SVG progress circle dimensions
  const circumference = 2 * Math.PI * 54; // r=54
  const dashOffset = circumference - (progressPercent / 100) * circumference;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        .prepare-root {
          min-height: calc(100vh - 64px);
          width: 100%;
          background: #050810;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          font-family: 'Inter', sans-serif;
          padding: 2.5rem 1rem;
        }

        /* Ambient glowing background */
        .prepare-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 65% 55% at 20% 20%, rgba(0, 212, 232, 0.08) 0%, transparent 60%),
            radial-gradient(ellipse 55% 65% at 80% 80%, rgba(149, 101, 245, 0.08) 0%, transparent 60%),
            radial-gradient(ellipse 40% 40% at 50% 50%, rgba(52, 211, 153, 0.05) 0%, transparent 70%);
          pointer-events: none;
        }

        /* High-tech grid overlay */
        .prepare-root::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
        }

        /* Central animated orb */
        .orb-ring {
          position: relative;
          width: 148px;
          height: 148px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .orb-ring svg {
          position: absolute;
          inset: 0;
        }

        .orb-inner {
          width: 108px;
          height: 108px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.4rem;
          transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          z-index: 1;
        }

        .orb-glow {
          position: absolute;
          inset: -10px;
          border-radius: 50%;
          filter: blur(20px);
          opacity: 0.45;
          transition: background 0.6s ease;
          animation: pulse-glow 2.4s ease-in-out infinite;
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 0.35; transform: scale(0.95); }
          50%       { opacity: 0.65; transform: scale(1.06); }
        }

        /* Orbiting ambient particles */
        .orb-particle {
          position: absolute;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--accent);
          opacity: 0;
          box-shadow: 0 0 10px var(--accent);
          animation: particle-orbit 4s linear infinite;
        }

        @keyframes particle-orbit {
          0%   { opacity: 0; transform: rotate(0deg) translateX(82px) scale(0.6); }
          15%  { opacity: 0.9; }
          85%  { opacity: 0.9; }
          100% { opacity: 0; transform: rotate(360deg) translateX(82px) scale(0.6); }
        }

        /* Step list cards */
        .step-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.02);
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .step-item.active {
          border-color: rgba(0, 212, 232, 0.35);
          background: rgba(0, 212, 232, 0.05);
          box-shadow: 0 0 24px rgba(0, 212, 232, 0.08);
          transform: translateY(-1px);
        }
        .step-item.done {
          border-color: rgba(52, 211, 153, 0.2);
          background: rgba(52, 211, 153, 0.03);
        }

        .step-icon-badge {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          flex-shrink: 0;
          transition: all 0.4s ease;
        }
        .step-icon-badge.pending {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.3);
        }
        .step-icon-badge.active {
          background: rgba(0, 212, 232, 0.15);
          border: 1px solid rgba(0, 212, 232, 0.4);
          box-shadow: 0 0 12px rgba(0, 212, 232, 0.25);
          animation: pulse-step 1.8s ease-in-out infinite;
        }
        .step-icon-badge.done {
          background: rgba(52, 211, 153, 0.15);
          border: 1px solid rgba(52, 211, 153, 0.4);
          color: #34D399;
        }

        @keyframes pulse-step {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0,212,232,0.3); }
          50%       { box-shadow: 0 0 0 6px rgba(0,212,232,0.08); }
        }

        /* Progress track */
        .progress-track {
          width: 100%;
          height: 4px;
          background: rgba(255,255,255,0.06);
          border-radius: 99px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          border-radius: 99px;
          transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          background: linear-gradient(90deg, #00D4E8, #9565F5, #34D399);
          background-size: 200% 100%;
          animation: shimmer 3s linear infinite;
        }
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* Subtle scanline */
        .scanline {
          position: absolute;
          width: 100%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0,212,232,0.2), transparent);
          animation: scan 4s linear infinite;
          pointer-events: none;
        }
        @keyframes scan {
          0%   { top: 0; }
          100% { top: 100%; }
        }
      `}</style>

      <div className="prepare-root">
        <div className="scanline" />

        <div
          style={{
            position: "relative",
            zIndex: 10,
            width: "100%",
            maxWidth: 580,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.75rem",
          }}
        >
          {/* Top badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 16px",
              borderRadius: 99,
              border: "1px solid rgba(0,212,232,0.25)",
              background: "rgba(0,212,232,0.06)",
              fontSize: 11,
              fontFamily: "monospace",
              color: "#00D4E8",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#00D4E8",
                boxShadow: "0 0 10px #00D4E8",
                animation: "pulse-glow 1.5s ease-in-out infinite",
              }}
            />
            NEURA LEARNING ENGINE · PREPARING EXPERIENCE
          </div>

          {/* If No Match Found: Polished Fallback View */}
          {hasNoMatch ? (
            <div
              style={{
                width: "100%",
                background: "#0B1020",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 20,
                padding: "2rem",
                boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: "1.5rem",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: "rgba(0,212,232,0.12)",
                  border: "1px solid rgba(0,212,232,0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#00D4E8",
                  fontSize: 24,
                  boxShadow: "0 0 25px rgba(0,212,232,0.2)",
                }}
              >
                <Sparkles size={26} />
              </div>

              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "3px 12px",
                    borderRadius: 99,
                    border: "1px solid rgba(0,212,232,0.3)",
                    background: "rgba(0,212,232,0.08)",
                    color: "#00D4E8",
                    fontSize: 10,
                    fontFamily: "monospace",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#00D4E8",
                      animation: "pulse-glow 1.5s ease-in-out infinite",
                    }}
                  />
                  GENERATION LIMIT REACHED
                </div>
                <h2
                  style={{
                    fontSize: "1.45rem",
                    fontWeight: 700,
                    color: "#F5F7FC",
                    marginBottom: 8,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Your Video Credits Are Over!
                </h2>
                <p
                  style={{
                    fontSize: 13,
                    color: "rgba(154,168,188,0.85)",
                    lineHeight: 1.6,
                    maxWidth: 440,
                    margin: "0 auto",
                  }}
                >
                  You&apos;ve used all your available video-generation credits. Please upgrade to the <strong style={{ color: "#00D4E8" }}>NEURA Pro Plan</strong> to unlock custom video rendering for &ldquo;{topic || "this topic"}&rdquo;.
                </p>
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  width: "100%",
                  paddingTop: 8,
                }}
              >
                <Link href="/pricing" style={{ flex: "1 1 180px" }}>
                  <button
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: 12,
                      border: "none",
                      background: "linear-gradient(90deg, #00D4E8, #00B4C8)",
                      color: "#050810",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      boxShadow: "0 0 20px rgba(0,212,232,0.3)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <Sparkles size={15} />
                    Upgrade to Pro Plan
                  </button>
                </Link>

                <Link href="/create" style={{ flex: "1 1 180px" }}>
                  <button
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.04)",
                      color: "rgba(245,247,252,0.85)",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      transition: "all 0.2s ease",
                    }}
                  >
                    <RotateCcw size={15} />
                    Return to Topic Editor
                  </button>
                </Link>

                <Link href="/result?errorCode=CREDITS_EXHAUSTED" style={{ width: "100%" }}>
                  <button
                    style={{
                      width: "100%",
                      padding: "9px 14px",
                      borderRadius: 10,
                      border: "none",
                      background: "transparent",
                      color: "rgba(154,168,188,0.7)",
                      fontSize: 12,
                      cursor: "pointer",
                      textDecoration: "underline",
                      textUnderlineOffset: 3,
                    }}
                  >
                    Continue to Generated Notes & Quiz →
                  </button>
                </Link>
              </div>
            </div>
          ) : errorMessage ? (
            /* Error State with Recovery Action */
            <div
              style={{
                width: "100%",
                background: "#0B1020",
                border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: 20,
                padding: "2rem",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "1.25rem",
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#EF4444",
                }}
              >
                <AlertCircle size={26} />
              </div>
              <div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#F5F7FC", marginBottom: 6 }}>
                  Preparation Interrupted
                </h3>
                <p style={{ fontSize: 13, color: "rgba(154,168,188,0.85)", maxWidth: 380, margin: "0 auto", lineHeight: 1.5 }}>
                  {errorMessage}
                </p>
              </div>
              <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 360 }}>
                <button
                  onClick={handleRetry}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    borderRadius: 12,
                    border: "1px solid rgba(0,212,232,0.3)",
                    background: "rgba(0,212,232,0.12)",
                    color: "#00D4E8",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Retry Preparation
                </button>
                <Link href="/create" style={{ flex: 1 }}>
                  <button
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.04)",
                      color: "rgba(154,168,188,0.9)",
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Return to Editor
                  </button>
                </Link>
              </div>
            </div>
          ) : (
            /* Active 4-Stage Preparation Progression */
            <>
              {/* Central Glowing Progress Ring */}
              <div className="orb-ring">
                <svg viewBox="0 0 148 148" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle
                    cx="74"
                    cy="74"
                    r="54"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="3.5"
                    fill="none"
                  />
                  <circle
                    cx="74"
                    cy="74"
                    r="54"
                    stroke={stage.accent}
                    strokeWidth="3.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    transform="rotate(-90 74 74)"
                    style={{
                      transition: "stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.6s ease",
                    }}
                  />
                </svg>

                {/* Orbiting particles */}
                {[0, 1, 2, 3].map((i) => (
                  <OrbParticle
                    key={i}
                    accent={stage.accent}
                    delay={i * 1.0}
                  />
                ))}

                {/* Soft ambient glow halo */}
                <div
                  className="orb-glow"
                  style={{ background: stage.accent }}
                />

                {/* Inner Icon */}
                <div
                  className="orb-inner"
                  style={{
                    background: `radial-gradient(circle at 40% 40%, rgba(15,23,42,0.8), rgba(5,8,16,0.95))`,
                    border: `1px solid ${stage.accent}35`,
                    boxShadow: `inset 0 0 24px ${stage.accent}15, 0 0 35px ${stage.accent}20`,
                  }}
                >
                  <span
                    role="img"
                    aria-label="stage icon"
                    style={{
                      filter: "drop-shadow(0 0 10px currentColor)",
                      transition: "transform 0.4s ease",
                    }}
                  >
                    {isCompleted ? "✓" : stage.icon}
                  </span>
                </div>
              </div>

              {/* Main Headline */}
              <div style={{ textAlign: "center", marginTop: "0.25rem" }}>
                <h1
                  style={{
                    fontSize: "clamp(1.5rem, 4vw, 2.05rem)",
                    fontWeight: 800,
                    color: "#F5F7FC",
                    letterSpacing: "-0.025em",
                    marginBottom: 8,
                  }}
                >
                  Preparing Your Learning Experience
                </h1>
                <p
                  style={{
                    fontSize: 14,
                    color: "rgba(154,168,188,0.9)",
                    maxWidth: 460,
                    lineHeight: 1.6,
                    margin: "0 auto",
                  }}
                >
                  {stage.sub}
                </p>
              </div>

              {/* 4 Progressive Stages List */}
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
                {PREP_STAGES.map((s, i) => {
                  const isDone = isCompleted || currentStageIdx > i;
                  const isActive = !isCompleted && currentStageIdx === i;

                  return (
                    <div
                      key={s.id}
                      className={`step-item${isActive ? " active" : isDone ? " done" : ""}`}
                    >
                      <div
                        className={`step-icon-badge${isActive ? " active" : isDone ? " done" : " pending"}`}
                      >
                        {isDone ? (
                          <Check size={16} strokeWidth={2.6} />
                        ) : (
                          <span>{s.icon}</span>
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: isActive ? "#F5F7FC" : isDone ? "rgba(245,247,252,0.85)" : "rgba(255,255,255,0.3)",
                            transition: "color 0.3s ease",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span>{s.title}</span>
                          {isDone && (
                            <span
                              style={{
                                fontSize: 10,
                                fontFamily: "monospace",
                                color: "#34D399",
                                background: "rgba(52,211,153,0.1)",
                                padding: "2px 6px",
                                borderRadius: 4,
                              }}
                            >
                              Ready
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: isActive ? "rgba(154,168,188,0.9)" : "rgba(154,168,188,0.4)",
                            lineHeight: 1.4,
                            marginTop: 2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {s.sub}
                        </div>
                      </div>

                      {isActive && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background: s.accent,
                              boxShadow: `0 0 10px ${s.accent}`,
                              animation: "pulse-glow 1.2s ease-in-out infinite",
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Progress Bar reflecting real progression */}
              <div style={{ width: "100%", marginTop: "0.5rem" }}>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 8,
                    fontSize: 11,
                    fontFamily: "monospace",
                    color: "rgba(154,168,188,0.6)",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Sparkles size={12} color="#00D4E8" />
                    <span>
                      {isCompleted
                        ? "Experience Ready · Launching"
                        : `Stage ${currentStageIdx + 1} of ${PREP_STAGES.length}: ${stage.title}`}
                    </span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {/* Background status indicator (no countdown timer displayed to user) */}
                    {!isCompleted ? (
                      <span
                        style={{
                          color: "rgba(154,168,188,0.7)",
                          fontFamily: "monospace",
                          fontSize: 11,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: stage.accent,
                            boxShadow: `0 0 8px ${stage.accent}`,
                            animation: "pulse-glow 1.5s ease-in-out infinite",
                          }}
                        />
                        <span>AI Pipeline Active</span>
                      </span>
                    ) : (
                      <span
                        style={{
                          color: "#34D399",
                          fontFamily: "monospace",
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        Ready!
                      </span>
                    )}
                    <span style={{ color: stage.accent, fontWeight: 600 }}>
                      {progressPercent}%
                    </span>
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
