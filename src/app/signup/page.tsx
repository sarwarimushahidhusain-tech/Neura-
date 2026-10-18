"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Zap,
  Gift,
  Check,
  Info
} from "lucide-react";
import {
  signupWithCredentials,
  signInWithOAuth,
  evaluatePasswordStrength,
  isValidEmail,
  isDemoAuthAllowed,
  getAuthMode,
  sanitizeRedirectUrl
} from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Stale request guard
  const requestCountRef = useRef(0);

  // Dynamic Password Validation calculation (client usability guide)
  const strength = evaluatePasswordStrength(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const strengthLabels = ["Weak", "Fair", "Good", "Strong"];
  const strengthColors = ["bg-red-500", "bg-amber-500", "bg-[#0FA4AF]", "bg-[#AFDDE5]"];

  const authMode = getAuthMode();
  const demoAllowed = isDemoAuthAllowed();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // Prevent duplicate submissions

    setErrorMessage(null);
    setSuccessMessage(null);
    setInfoMessage(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage("Please enter your full name or workspace name (at least 2 characters).");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setErrorMessage("Please enter a valid work or personal email address.");
      return;
    }

    if (!strength.isValid) {
      setErrorMessage("Password must be at least 8 characters long and contain both letters and numbers.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please verify your confirmation password.");
      return;
    }

    if (!agreeTerms) {
      setErrorMessage("Please accept the terms of service and responsible AI guidelines to continue.");
      return;
    }

    setIsLoading(true);
    const currentRequestId = ++requestCountRef.current;

    try {
      const user = await signupWithCredentials(trimmedName, trimmedEmail, password, agreeTerms, true);

      // Guard against stale requests
      if (currentRequestId !== requestCountRef.current) return;

      if (user.isEmailConfirmationPending) {
        setSuccessMessage(
          `Account created! A confirmation link has been sent to ${user.email}. Please verify your email before signing in.`
        );
        setIsLoading(false);
        return;
      }

      setSuccessMessage(
        demoAllowed
          ? `Local development workspace created for ${user.name}! 100 prototype scene credits allocated.`
          : `Account workspace created for ${user.name}!`
      );

      // Safe relative redirect
      const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const targetParam = urlParams?.get("redirect");
      const safeTarget = sanitizeRedirectUrl(targetParam, "/create");

      setTimeout(() => {
        router.push(safeTarget);
      }, 750);
    } catch (err: unknown) {
      if (currentRequestId !== requestCountRef.current) return;

      const msg = err instanceof Error ? err.message : "Registration failed. Please try again.";
      setErrorMessage(msg);
      setIsLoading(false);
    }
  };

  const handleSocialClick = async (provider: "google" | "github") => {
    setErrorMessage(null);
    setInfoMessage(null);
    if (authMode === "provider_active") {
      try {
        await signInWithOAuth(provider);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : `Failed to start ${provider} registration.`;
        setErrorMessage(msg);
      }
    } else {
      setInfoMessage(
        `${provider.toUpperCase()} OAuth requires configuring Supabase provider credentials. In local mode, please complete the email registration form.`
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#071D20] text-[#EAF6F6] auth-grid-cyan relative flex flex-col justify-center items-center py-10 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Ambient background glows */}
      <div
        className="absolute top-1/4 right-1/6 w-96 h-96 rounded-full bg-[#0FA4AF]/15 blur-[120px] pointer-events-none animate-pulse-subtle"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-1/4 left-1/6 w-[450px] h-[450px] rounded-full bg-[#024950]/35 blur-[140px] pointer-events-none animate-pulse-subtle"
        style={{ animationDelay: "3s" }}
        aria-hidden="true"
      />

      {/* Main Container: 2-column on desktop */}
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10">

        {/* ========================================================= */}
        {/* LEFT COLUMN: Branded Showcase & Benefits (Desktop >= lg) */}
        {/* ========================================================= */}
        <div className="hidden lg:flex lg:col-span-6 flex-col justify-between h-[720px] p-10 rounded-3xl auth-glass-panel relative overflow-hidden group">
          {/* Subtle inner grid & lighting */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0FA4AF]/10 via-transparent to-[#024950]/20 pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-64 h-64 rounded-full bg-[#0FA4AF]/15 blur-3xl pointer-events-none" />

          {/* Top Brand Header */}
          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#024950] to-[#0FA4AF] p-0.5 shadow-[0_0_20px_rgba(15,164,175,0.4)]">
                  <div className="h-full w-full bg-[#071D20] rounded-[10px] flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-[#0FA4AF]" />
                  </div>
                </div>
                <span className="text-2xl font-bold tracking-tight text-[#EAF6F6]">NEURA</span>
              </Link>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#0F2E33] border border-[#0FA4AF]/30 text-[#AFDDE5]">
                <Gift className="w-3.5 h-3.5 text-[#0FA4AF]" />
                100 Free Compute Credits
              </span>
            </div>

            <div className="pt-2">
              <h2 className="text-3xl font-extrabold tracking-tight text-[#EAF6F6] leading-snug">
                The next frontier of AI video generation.
              </h2>
              <p className="mt-2 text-sm text-[#A7C4C6] leading-relaxed max-w-md">
                Create full educational modules and cinematic 3D simulations. From a single text topic into multi-scene 4K temporal video in seconds.
              </p>
            </div>
          </div>

          {/* Center Graphic: Feature Highlight Cards */}
          <div className="relative z-10 my-4 space-y-3">
            <div className="p-4 rounded-2xl bg-[#071D20]/80 border border-[#0FA4AF]/25 shadow-lg backdrop-blur-md flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-[#0F2E33] border border-[#0FA4AF]/30 flex items-center justify-center text-[#0FA4AF] shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-[#EAF6F6]">Multi-Engine Parallel Rendering</div>
                <div className="text-[11px] text-[#A7C4C6] mt-0.5">
                  Synchronizes Scene Planner, Depth Mesh, and 4K Temporal Synthesis simultaneously.
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#071D20]/80 border border-[#0FA4AF]/25 shadow-lg backdrop-blur-md flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-[#0F2E33] border border-[#0FA4AF]/30 flex items-center justify-center text-[#AFDDE5] shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-[#EAF6F6]">Zero 3D Skills Required</div>
                <div className="text-[11px] text-[#A7C4C6] mt-0.5">
                  Type any scientific or educational concept. Neura handles cinematic lighting, camera paths, and 3D assets.
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0F2E33]/50 border border-[#0FA4AF]/20 flex items-center justify-between text-xs text-[#AFDDE5]">
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#0FA4AF]" />
                No credit card required to start
              </span>
              <span className="text-[11px] font-mono text-[#A7C4C6]">Instant setup</span>
            </div>
          </div>

          {/* Bottom Social Proof */}
          <div className="relative z-10 pt-4 border-t border-[#0FA4AF]/15 flex items-center justify-between text-xs text-[#A7C4C6]">
            <div>
              <span className="font-semibold text-[#EAF6F6]">1.2M+</span> scenes generated this month
            </div>
            <div className="flex items-center gap-1.5 text-[#0FA4AF]">
              <span className="w-2 h-2 rounded-full bg-[#0FA4AF] inline-block" />
              <span>GPU Clusters Active</span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Glassmorphic Signup Card (Desktop & Mobile) */}
        {/* ========================================================= */}
        <div className="col-span-1 lg:col-span-6 flex justify-center">
          <div className="w-full max-w-md auth-glass-card rounded-2xl p-7 sm:p-9 relative">

            {/* Mobile Header (Brand Icon + Title) */}
            <div className="lg:hidden flex items-center justify-center gap-2.5 mb-6">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#024950] to-[#0FA4AF] p-0.5 shadow-[0_0_15px_rgba(15,164,175,0.4)]">
                <div className="h-full w-full bg-[#071D20] rounded-[10px] flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-[#0FA4AF]" />
                </div>
              </div>
              <span className="text-xl font-bold tracking-tight text-[#EAF6F6]">NEURA</span>
            </div>

            {/* Header */}
            <div className="space-y-1.5 mb-5">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#EAF6F6]">
                  Create your account
                </h1>
                {demoAllowed && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#024950]/80 text-[#AFDDE5] border border-[#0FA4AF]/30">
                    Dev Mock Mode
                  </span>
                )}
              </div>
              <p className="text-sm text-[#A7C4C6]">
                Start generating cinematic 3D videos with 100 free credits.
              </p>
            </div>

            {/* Unconfigured Production Mode Warning */}
            {authMode === "production_unconfigured" && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Notice:</strong> Production registration backend is not yet configured.
                </div>
              </div>
            )}

            {/* Error / Feedback Banners */}
            {errorMessage && (
              <div
                id="signup-error-alert"
                role="alert"
                className="mb-4 p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {infoMessage && (
              <div
                role="status"
                className="mb-4 p-3.5 rounded-xl bg-[#0F2E33]/90 border border-[#0FA4AF]/40 text-[#AFDDE5] text-xs flex items-start gap-2.5 animate-in fade-in"
              >
                <Info className="w-4 h-4 text-[#0FA4AF] shrink-0 mt-0.5" />
                <span className="leading-relaxed">{infoMessage}</span>
              </div>
            )}

            {successMessage && (
              <div
                role="status"
                className="mb-4 p-3.5 rounded-xl bg-[#024950]/60 border border-[#0FA4AF]/50 text-[#AFDDE5] text-xs flex items-start gap-2.5 animate-in fade-in"
              >
                <CheckCircle2 className="w-4 h-4 text-[#0FA4AF] shrink-0 mt-0.5" />
                <span className="leading-relaxed">{successMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSignup} className="space-y-3.5" noValidate>

              {/* Full Name */}
              <div className="space-y-1">
                <label
                  htmlFor="signup-name"
                  className="block text-xs font-semibold text-[#AFDDE5] uppercase tracking-wider"
                >
                  Full Name / Workspace
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A7C4C6]">
                    <User className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <input
                    id="signup-name"
                    name="name"
                    type="text"
                    required
                    aria-required="true"
                    aria-invalid={Boolean(errorMessage && !name.trim())}
                    aria-describedby={errorMessage ? "signup-error-alert" : undefined}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Alex Chen"
                    disabled={isLoading}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0B1416]/90 border border-[#0FA4AF]/25 rounded-xl text-sm text-[#EAF6F6] placeholder-[#A7C4C6]/60 focus:outline-none focus:border-[#0FA4AF] focus:ring-2 focus:ring-[#0FA4AF]/25 transition-all disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Work Email */}
              <div className="space-y-1">
                <label
                  htmlFor="signup-email"
                  className="block text-xs font-semibold text-[#AFDDE5] uppercase tracking-wider"
                >
                  Work Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A7C4C6]">
                    <Mail className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <input
                    id="signup-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    aria-required="true"
                    aria-invalid={Boolean(errorMessage && !isValidEmail(email))}
                    aria-describedby={errorMessage ? "signup-error-alert" : undefined}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="alex@studio.ai"
                    disabled={isLoading}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0B1416]/90 border border-[#0FA4AF]/25 rounded-xl text-sm text-[#EAF6F6] placeholder-[#A7C4C6]/60 focus:outline-none focus:border-[#0FA4AF] focus:ring-2 focus:ring-[#0FA4AF]/25 transition-all disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1">
                <label
                  htmlFor="signup-password"
                  className="block text-xs font-semibold text-[#AFDDE5] uppercase tracking-wider"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A7C4C6]">
                    <Lock className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <input
                    id="signup-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    aria-required="true"
                    aria-invalid={Boolean(errorMessage && !strength.isValid)}
                    aria-describedby={errorMessage ? "signup-error-alert" : undefined}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="At least 8 characters (letters + numbers)"
                    disabled={isLoading}
                    className="w-full pl-10 pr-11 py-2.5 bg-[#0B1416]/90 border border-[#0FA4AF]/25 rounded-xl text-sm text-[#EAF6F6] placeholder-[#A7C4C6]/60 focus:outline-none focus:border-[#0FA4AF] focus:ring-2 focus:ring-[#0FA4AF]/25 transition-all disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#A7C4C6] hover:text-[#EAF6F6] transition-colors focus:outline-none focus:ring-1 focus:ring-[#0FA4AF] rounded"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Password Strength Usability Feedback */}
                {password.length > 0 && (
                  <div className="pt-1.5 space-y-1.5" aria-live="polite">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#A7C4C6]">Usability guide:</span>
                      <span className="font-semibold text-[#AFDDE5]">
                        {strengthLabels[strength.score] || "Weak"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 h-1">
                      <div className={`h-full rounded-full transition-colors ${strength.score >= 1 ? strengthColors[strength.score] : "bg-[#0B1416]"}`} />
                      <div className={`h-full rounded-full transition-colors ${strength.score >= 2 ? strengthColors[strength.score] : "bg-[#0B1416]"}`} />
                      <div className={`h-full rounded-full transition-colors ${strength.score >= 3 ? strengthColors[strength.score] : "bg-[#0B1416]"}`} />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="signup-confirm-password"
                    className="block text-xs font-semibold text-[#AFDDE5] uppercase tracking-wider"
                  >
                    Confirm Password
                  </label>
                  {confirmPassword.length > 0 && (
                    <span
                      aria-live="polite"
                      className={`text-[11px] flex items-center gap-1 ${passwordsMatch ? "text-[#0FA4AF]" : "text-red-400"}`}
                    >
                      {passwordsMatch ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Passwords match</span>
                        </>
                      ) : (
                        <span>Passwords do not match</span>
                      )}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A7C4C6]">
                    <Lock className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <input
                    id="signup-confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    aria-required="true"
                    aria-invalid={Boolean(confirmPassword.length > 0 && !passwordsMatch)}
                    aria-describedby={errorMessage ? "signup-error-alert" : undefined}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Repeat password"
                    disabled={isLoading}
                    className="w-full pl-10 pr-11 py-2.5 bg-[#0B1416]/90 border border-[#0FA4AF]/25 rounded-xl text-sm text-[#EAF6F6] placeholder-[#A7C4C6]/60 focus:outline-none focus:border-[#0FA4AF] focus:ring-2 focus:ring-[#0FA4AF]/25 transition-all disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#A7C4C6] hover:text-[#EAF6F6] transition-colors focus:outline-none focus:ring-1 focus:ring-[#0FA4AF] rounded"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Terms Agreement Checkbox */}
              <div className="flex items-start pt-1">
                <input
                  id="agree-terms"
                  name="agreeTerms"
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="h-4 w-4 mt-0.5 rounded border-[#0FA4AF]/40 bg-[#0B1416] text-[#0FA4AF] focus:ring-[#0FA4AF]/30 focus:ring-offset-0 cursor-pointer accent-[#0FA4AF]"
                />
                <label
                  htmlFor="agree-terms"
                  className="ml-2.5 block text-xs text-[#A7C4C6] leading-relaxed select-none"
                >
                  I agree to Neura&apos;s Terms of Service and Privacy Policy, and accept responsible AI usage guidelines.
                </label>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 relative group overflow-hidden py-3 px-4 rounded-xl font-medium text-sm text-[#EAF6F6] bg-gradient-to-r from-[#024950] to-[#0FA4AF] hover:from-[#035d67] hover:to-[#12b9c6] shadow-[0_4px_20px_rgba(15,164,175,0.3)] transition-all duration-200 active:scale-[0.99] disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#AFDDE5]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#EAF6F6]" aria-hidden="true" />
                    <span>Allocating Workspace Credits...</span>
                  </>
                ) : (
                  <>
                    <span>Create Free Workspace</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
                  </>
                )}
                {/* Glow sweep effect */}
                <span
                  className="absolute inset-0 w-1/2 h-full bg-white/10 skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-out pointer-events-none"
                  aria-hidden="true"
                />
              </button>
            </form>

            {/* Social / Single Sign-On Alternatives */}
            <div className="mt-5">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#0FA4AF]/20" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#0F2E33] px-2.5 text-[#A7C4C6] font-mono text-[11px]">
                    or sign up with
                  </span>
                </div>
              </div>

              <div className="mt-3.5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSocialClick("google")}
                  className="py-2.5 px-3 rounded-xl bg-[#0B1416]/80 hover:bg-[#0B1416] border border-[#0FA4AF]/20 hover:border-[#0FA4AF]/40 text-xs font-medium text-[#EAF6F6] transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#0FA4AF]"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z" />
                    <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1c0 2.8.7 5.4 1.9 7.8l3.7-2.9z" />
                    <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.9C3.7 20.6 7.5 23.5 12 23.5z" />
                  </svg>
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSocialClick("github")}
                  className="py-2.5 px-3 rounded-xl bg-[#0B1416]/80 hover:bg-[#0B1416] border border-[#0FA4AF]/20 hover:border-[#0FA4AF]/40 text-xs font-medium text-[#EAF6F6] transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#0FA4AF]"
                >
                  <svg className="w-3.5 h-3.5 fill-current shrink-0 text-[#EAF6F6]" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  <span>GitHub</span>
                </button>
              </div>
            </div>

            {/* Bottom Navigation Back to Login */}
            <div className="mt-6 pt-4 border-t border-[#0FA4AF]/20 text-center text-xs text-[#A7C4C6]">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-[#0FA4AF] hover:text-[#AFDDE5] transition-colors underline-offset-4 hover:underline"
              >
                Sign in to workspace
              </Link>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
