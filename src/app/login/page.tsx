"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Video,
  Layers,
  Cpu,
  Info
} from "lucide-react";
import {
  loginWithCredentials,
  getRememberedEmail,
  sendPasswordReset,
  signInWithOAuth,
  isValidEmail,
  sanitizeRedirectUrl,
  isDemoAuthAllowed,
  getAuthMode
} from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Password reset modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  // Stale request guard
  const requestCountRef = useRef(0);

  // Pre-fill remembered email and check for callback error on mount
  useEffect(() => {
    const rem = getRememberedEmail();
    if (rem) {
      setTimeout(() => setEmail(rem), 0);
    }
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const err = params.get("error");
      if (err) {
        setTimeout(() => {
          if (err === "auth_callback_failed") {
            setErrorMessage("Authentication callback failed or session could not be established. Please try logging in directly.");
          } else {
            setErrorMessage(decodeURIComponent(err));
          }
        }, 0);
      }
    }
  }, []);

  // Keyboard accessibility for modal (Escape closes)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showResetModal) {
        setShowResetModal(false);
        setResetFeedback(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showResetModal]);

  const authMode = getAuthMode();
  const demoAllowed = isDemoAuthAllowed();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // Prevent duplicate submissions

    setErrorMessage(null);
    setSuccessMessage(null);
    setInfoMessage(null);

    const trimmedEmail = email.trim();

    // Client-side usability validation
    if (!trimmedEmail) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setErrorMessage("Please enter a valid email address format (e.g. name@company.com).");
      return;
    }

    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);
    const currentRequestId = ++requestCountRef.current;

    try {
      const user = await loginWithCredentials(trimmedEmail, password, rememberMe);

      // Guard against stale asynchronous responses
      if (currentRequestId !== requestCountRef.current) return;

      setSuccessMessage(`Welcome back, ${user.name}! Redirecting to your workspace...`);

      // Safe relative redirect validation to prevent open-redirect vulnerabilities
      const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const targetParam = urlParams?.get("redirect");
      const safeTarget = sanitizeRedirectUrl(targetParam, "/projects");

      setTimeout(() => {
        router.push(safeTarget);
      }, 600);
    } catch (err: unknown) {
      if (currentRequestId !== requestCountRef.current) return;

      const msg = err instanceof Error ? err.message : "Authentication failed. Please verify your credentials.";
      setErrorMessage(msg);
      setIsLoading(false);
    }
  };

  const fillDemoAccount = () => {
    if (!demoAllowed) {
      setErrorMessage("Demo authentication is disabled in production mode. Please configure an authentication provider.");
      return;
    }
    setEmail("demo.creator@neura.local");
    setPassword("Demo#2026");
    setErrorMessage(null);
    setInfoMessage("Pre-filled development demo credentials. Click 'Sign In' to enter the local studio.");
  };

  const handleSocialClick = async (provider: "google" | "github") => {
    setErrorMessage(null);
    setInfoMessage(null);
    if (authMode === "provider_active") {
      try {
        await signInWithOAuth(provider);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : `Failed to start ${provider} login.`;
        setErrorMessage(msg);
      }
    } else {
      setInfoMessage(
        `${provider.toUpperCase()} OAuth requires configuring Supabase provider credentials. In local mode, please use email sign-in or demo credentials.`
      );
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetLoading) return;

    if (!resetEmail.trim() || !isValidEmail(resetEmail.trim())) {
      setResetFeedback("Please enter a valid registered email address.");
      return;
    }

    setResetLoading(true);
    try {
      const result = await sendPasswordReset(resetEmail.trim());
      setResetFeedback(result.message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to process password reset.";
      setResetFeedback(msg);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#071D20] text-[#EAF6F6] auth-grid-cyan relative flex flex-col justify-center items-center py-10 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Ambient background glows */}
      <div
        className="absolute top-1/4 left-1/6 w-96 h-96 rounded-full bg-[#0FA4AF]/15 blur-[120px] pointer-events-none animate-pulse-subtle"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-1/4 right-1/6 w-[450px] h-[450px] rounded-full bg-[#024950]/35 blur-[140px] pointer-events-none animate-pulse-subtle"
        style={{ animationDelay: "3s" }}
        aria-hidden="true"
      />

      {/* Main Container: 2-column on desktop */}
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10">

        {/* ========================================================= */}
        {/* LEFT COLUMN: Branded Futuristic Showcase (Desktop >= lg) */}
        {/* ========================================================= */}
        <div className="hidden lg:flex lg:col-span-6 flex-col justify-between h-[660px] p-10 rounded-3xl auth-glass-panel relative overflow-hidden group">
          {/* Subtle inner grid & lighting */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0FA4AF]/10 via-transparent to-[#024950]/20 pointer-events-none" />
          <div className="absolute -right-24 -top-24 w-64 h-64 rounded-full bg-[#0FA4AF]/15 blur-3xl pointer-events-none" />

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
                <span className="w-1.5 h-1.5 rounded-full bg-[#0FA4AF] animate-ping" />
                {demoAllowed ? "Prototype Studio" : "Multi-Engine v2.4"}
              </span>
            </div>

            <div className="pt-2">
              <h2 className="text-3xl font-extrabold tracking-tight text-[#EAF6F6] leading-snug">
                Craft cinematic 3D stories at the speed of thought.
              </h2>
              <p className="mt-2 text-sm text-[#A7C4C6] leading-relaxed max-w-md">
                Turn complex concepts, medical biology, and astrophysics into hyper-accurate, animated 3D video scenes with multi-model AI synthesis.
              </p>
            </div>
          </div>

          {/* Center Graphic: Futuristic Holographic Pipeline Preview */}
          <div className="relative z-10 my-4 p-5 rounded-2xl bg-[#071D20]/80 border border-[#0FA4AF]/25 shadow-xl backdrop-blur-md space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#0FA4AF]/15 pb-3">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-[#0FA4AF]" />
                <span className="text-xs font-mono font-medium text-[#AFDDE5]">Scene: Blood Flow & Mitral Valve</span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#0FA4AF]/15 text-[#0FA4AF] border border-[#0FA4AF]/30">
                4K UHD • 60 FPS
              </span>
            </div>

            {/* Neural Stage Tracker */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-lg bg-[#0F2E33]/60 border border-[#0FA4AF]/20 text-center">
                <Layers className="w-3.5 h-3.5 text-[#0FA4AF] mx-auto mb-1" />
                <div className="text-[10px] text-[#A7C4C6]">Scene Breakdown</div>
                <div className="text-xs font-semibold text-[#EAF6F6]">4 Keyframes</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0F2E33]/60 border border-[#0FA4AF]/20 text-center">
                <Cpu className="w-3.5 h-3.5 text-[#0FA4AF] mx-auto mb-1" />
                <div className="text-[10px] text-[#A7C4C6]">Temporal Engine</div>
                <div className="text-xs font-semibold text-[#EAF6F6]">Active Cluster</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0F2E33]/60 border border-[#0FA4AF]/20 text-center">
                <ShieldCheck className="w-3.5 h-3.5 text-[#AFDDE5] mx-auto mb-1" />
                <div className="text-[10px] text-[#A7C4C6]">Mesh Fidelity</div>
                <div className="text-xs font-semibold text-[#AFDDE5]">99.8% Physics</div>
              </div>
            </div>

            {/* Simulated Live Generation Pulse bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[11px] text-[#A7C4C6]">
                <span>Active Generation Pipeline</span>
                <span className="text-[#0FA4AF] font-mono">1.4s Latency</span>
              </div>
              <div className="h-1.5 w-full bg-[#0F2E33] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#024950] via-[#0FA4AF] to-[#AFDDE5] rounded-full w-4/5 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Bottom Social Proof */}
          <div className="relative z-10 pt-4 border-t border-[#0FA4AF]/15 flex items-center justify-between text-xs text-[#A7C4C6]">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                <div className="w-7 h-7 rounded-full bg-[#024950] border-2 border-[#071D20] flex items-center justify-center text-[10px] font-bold text-[#EAF6F6]">MK</div>
                <div className="w-7 h-7 rounded-full bg-[#0FA4AF] border-2 border-[#071D20] flex items-center justify-center text-[10px] font-bold text-[#071D20]">SL</div>
                <div className="w-7 h-7 rounded-full bg-[#AFDDE5] border-2 border-[#071D20] flex items-center justify-center text-[10px] font-bold text-[#071D20]">RN</div>
              </div>
              <span>Joined by 14,000+ scientific & 3D creators</span>
            </div>
            <div className="flex items-center gap-1 text-[#0FA4AF] font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Enterprise Ready</span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Glassmorphic Login Card (Desktop & Mobile)  */}
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
            <div className="space-y-1.5 mb-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#EAF6F6]">
                  Welcome back
                </h1>
                {demoAllowed && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#024950]/80 text-[#AFDDE5] border border-[#0FA4AF]/30">
                    Dev Mock Mode
                  </span>
                )}
              </div>
              <p className="text-sm text-[#A7C4C6]">
                Enter your credentials to access your 3D video studio.
              </p>
            </div>

            {/* Unconfigured Production Mode Warning */}
            {authMode === "production_unconfigured" && (
              <div
                role="alert"
                className="mb-5 p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Notice:</strong> Production authentication provider is not configured. Logins are disabled until configured.
                </div>
              </div>
            )}

            {/* Demo Account Quick-Fill Pill (Development Only) */}
            {demoAllowed && (
              <div className="mb-5 p-3 rounded-xl bg-[#0B1416]/90 border border-[#0FA4AF]/25 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="font-semibold text-[#AFDDE5] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#0FA4AF]" />
                    <span>Prototype Evaluation</span>
                  </div>
                  <div className="text-[11px] text-[#A7C4C6]">Pre-fill local development credentials</div>
                </div>
                <button
                  type="button"
                  onClick={fillDemoAccount}
                  className="px-2.5 py-1.5 rounded-lg bg-[#0FA4AF]/15 hover:bg-[#0FA4AF]/25 text-[#0FA4AF] border border-[#0FA4AF]/30 font-medium transition-colors text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0FA4AF]"
                >
                  Use Demo
                </button>
              </div>
            )}

            {/* Feedback Banners */}
            {errorMessage && (
              <div
                id="login-error-alert"
                role="alert"
                className="mb-5 p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {infoMessage && (
              <div
                role="status"
                className="mb-5 p-3.5 rounded-xl bg-[#0F2E33]/90 border border-[#0FA4AF]/40 text-[#AFDDE5] text-xs flex items-start gap-2.5 animate-in fade-in"
              >
                <Info className="w-4 h-4 text-[#0FA4AF] shrink-0 mt-0.5" />
                <span className="leading-relaxed">{infoMessage}</span>
              </div>
            )}

            {successMessage && (
              <div
                role="status"
                className="mb-5 p-3.5 rounded-xl bg-[#024950]/60 border border-[#0FA4AF]/50 text-[#AFDDE5] text-xs flex items-start gap-2.5 animate-in fade-in"
              >
                <CheckCircle2 className="w-4 h-4 text-[#0FA4AF] shrink-0 mt-0.5" />
                <span className="leading-relaxed">{successMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              {/* Email Field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold text-[#AFDDE5] uppercase tracking-wider"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A7C4C6]">
                    <Mail className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    aria-required="true"
                    aria-invalid={Boolean(errorMessage)}
                    aria-describedby={errorMessage ? "login-error-alert" : undefined}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="name@company.com"
                    disabled={isLoading}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0B1416]/90 border border-[#0FA4AF]/25 rounded-xl text-sm text-[#EAF6F6] placeholder-[#A7C4C6]/60 focus:outline-none focus:border-[#0FA4AF] focus:ring-2 focus:ring-[#0FA4AF]/25 transition-all disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-semibold text-[#AFDDE5] uppercase tracking-wider"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email || "");
                      setResetFeedback(null);
                      setShowResetModal(true);
                      setErrorMessage(null);
                    }}
                    className="text-xs text-[#0FA4AF] hover:text-[#AFDDE5] transition-colors focus:outline-none focus:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A7C4C6]">
                    <Lock className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    aria-required="true"
                    aria-invalid={Boolean(errorMessage)}
                    aria-describedby={errorMessage ? "login-error-alert" : undefined}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="••••••••••••"
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
              </div>

              {/* Remember Me */}
              <div className="flex items-center pt-1">
                <input
                  id="remember-me"
                  name="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-[#0FA4AF]/40 bg-[#0B1416] text-[#0FA4AF] focus:ring-[#0FA4AF]/30 focus:ring-offset-0 cursor-pointer accent-[#0FA4AF]"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2.5 block text-xs text-[#A7C4C6] cursor-pointer select-none"
                >
                  Remember my email on this device
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
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Studio</span>
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
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#0FA4AF]/20" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#0F2E33] px-2.5 text-[#A7C4C6] font-mono text-[11px]">
                    or continue with
                  </span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
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

            {/* Bottom Navigation */}
            <div className="mt-8 pt-5 border-t border-[#0FA4AF]/20 text-center text-xs text-[#A7C4C6]">
              Don&apos;t have an account yet?{" "}
              <Link
                href="/signup"
                className="font-semibold text-[#0FA4AF] hover:text-[#AFDDE5] transition-colors underline-offset-4 hover:underline"
              >
                Create your workspace
              </Link>
            </div>

          </div>
        </div>

      </div>

      {/* Forgot Password Modal (Phase F Hardened) */}
      {showResetModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
        >
          <div className="w-full max-w-sm p-6 rounded-2xl auth-glass-panel border border-[#0FA4AF]/30 shadow-2xl relative">
            <h3 id="reset-modal-title" className="text-lg font-bold text-[#EAF6F6] mb-1">
              Reset your password
            </h3>
            <p className="text-xs text-[#A7C4C6] mb-4">
              Enter your registered email address to check recovery status.
            </p>

            {resetFeedback ? (
              <div className="space-y-4">
                <div
                  role="status"
                  className="p-3.5 rounded-xl bg-[#0F2E33] border border-[#0FA4AF]/40 text-xs text-[#AFDDE5] leading-relaxed"
                >
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-[#0FA4AF] shrink-0 mt-0.5" />
                    <span>{resetFeedback}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(false);
                    setResetFeedback(null);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-[#024950] hover:bg-[#0FA4AF]/30 text-xs font-medium text-[#EAF6F6] transition-colors"
                >
                  Dismiss
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="reset-email-input" className="block text-xs font-medium text-[#AFDDE5] mb-1">
                    Email address
                  </label>
                  <input
                    id="reset-email-input"
                    name="resetEmail"
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full px-3 py-2 bg-[#0B1416] border border-[#0FA4AF]/30 rounded-xl text-sm text-[#EAF6F6] placeholder-[#A7C4C6]/50 focus:outline-none focus:border-[#0FA4AF] focus:ring-2 focus:ring-[#0FA4AF]/20"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetModal(false);
                      setResetFeedback(null);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-transparent hover:bg-[#0F2E33] border border-[#0FA4AF]/20 text-xs font-medium text-[#A7C4C6] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-[#024950] to-[#0FA4AF] hover:from-[#035d67] hover:to-[#12b9c6] text-xs font-medium text-[#EAF6F6] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {resetLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Send Request"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
