"use client";

import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { createClient as createBrowserSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * NEURA AUTHENTICATION SERVICE BOUNDARY & SESSION MANAGEMENT (PHASE 1.8)
 *
 * Supports both:
 * 1. REAL SUPABASE AUTH (when NEXT_PUBLIC_SUPABASE_URL & ANON_KEY are configured)
 *    - Real email/password signInWithPassword and signUp
 *    - Server-side cookie sessions refreshed via Next.js middleware & @supabase/ssr
 *    - Real email verification and password reset flows
 *    - Real OAuth flows (Google & GitHub)
 * 2. DEVELOPMENT MOCK FALLBACK (strictly guarded for offline prototype development)
 */

export type AuthMode = "development_mock" | "production_unconfigured" | "provider_active";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: "creator" | "developer" | "reviewer";
  planLabel: string;
  isDemoSession: boolean;
  isEmailConfirmationPending?: boolean;
  sessionCreatedAt: number;
  sessionExpiresAt: number;
}

import {
  isValidEmail,
  evaluatePasswordStrength,
  sanitizeRedirectUrl,
  type PasswordValidationResult,
} from "./auth-utils";

export { isValidEmail, evaluatePasswordStrength, sanitizeRedirectUrl, type PasswordValidationResult };

export interface PasswordResetResponse {
  success: boolean;
  isMock: boolean;
  message: string;
}

const STORAGE_KEY = "neura_demo_session";
const REMEMBER_KEY = "neura_remember_email";
const AUTH_EVENT = "neura_auth_state_change";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours in mock mode

/**
 * Determine the active authentication mode based on environment.
 */
export function getAuthMode(): AuthMode {
  if (isSupabaseConfigured()) {
    return "provider_active";
  }

  const isProduction = typeof process !== "undefined" && process.env.NODE_ENV === "production";
  const demoExplicitlyAllowed = typeof process !== "undefined" && process.env.NEXT_PUBLIC_ENABLE_DEMO_AUTH === "true";

  if (isProduction && !demoExplicitlyAllowed) {
    return "production_unconfigured";
  }

  return "development_mock";
}

/**
 * Checks whether mock demo authentication is permitted in the current runtime.
 */
export function isDemoAuthAllowed(): boolean {
  return getAuthMode() === "development_mock";
}

/**
 * Retrieves the stored session with expiration validation.
 */
export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const user = JSON.parse(raw) as AuthUser;

    if (!user.sessionExpiresAt || Date.now() > user.sessionExpiresAt) {
      clearStoredUser();
      return null;
    }

    return user;
  } catch {
    clearStoredUser();
    return null;
  }
}

/**
 * Persists session and notifies listeners.
 */
export function setStoredUser(user: AuthUser, rememberEmail: boolean = true): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

    if (rememberEmail && user.email) {
      localStorage.setItem(REMEMBER_KEY, user.email);
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }

    window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: user }));
  } catch (err) {
    console.error("Failed to store session state:", err);
  }
}

/**
 * Clears session and broadcasts update.
 */
export function clearStoredUser(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: null }));
  } catch (err) {
    console.error("Failed to clear session:", err);
  }
}

/**
 * Retrieves remembered email for convenience.
 */
export function getRememberedEmail(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(REMEMBER_KEY) || "";
  } catch {
    return "";
  }
}

/**
 * Event-based subscription to keep Navbar and pages synchronized with both
 * Supabase auth state changes and local session events.
 */
export function subscribeToAuthChanges(callback: (user: AuthUser | null) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleCustomEvent = (e: Event) => {
    const detail = (e as CustomEvent<AuthUser | null>).detail;
    callback(detail);
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      callback(getStoredUser());
    }
  };

  window.addEventListener(AUTH_EVENT, handleCustomEvent);
  window.addEventListener("storage", handleStorageEvent);

  // If Supabase is configured, also listen to official Supabase auth state change
  const supabase = createBrowserSupabase();
  let supabaseUnsubscribe: (() => void) | null = null;

  if (supabase) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (session?.user) {
        const mappedUser: AuthUser = {
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Creator",
          email: session.user.email || "",
          role: "creator",
          planLabel: "Pro Member",
          isDemoSession: false,
          sessionCreatedAt: Date.now(),
          sessionExpiresAt: session.expires_at ? session.expires_at * 1000 : Date.now() + SESSION_TTL_MS,
        };
        setStoredUser(mappedUser, false);
        callback(mappedUser);
      } else {
        clearStoredUser();
        callback(null);
      }
    });

    supabaseUnsubscribe = () => subscription.unsubscribe();
  }

  return () => {
    window.removeEventListener(AUTH_EVENT, handleCustomEvent);
    window.removeEventListener("storage", handleStorageEvent);
    if (supabaseUnsubscribe) {
      supabaseUnsubscribe();
    }
  };
}

/**
 * Authenticates user with Supabase Auth (or development mock fallback).
 */
export async function loginWithCredentials(
  email: string,
  password: string,
  remember: boolean = true
): Promise<AuthUser> {
  const mode = getAuthMode();

  if (mode === "production_unconfigured") {
    throw new Error(
      "Authentication provider is not yet configured for production. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  const trimmedEmail = email.trim().toLowerCase();

  if (!isValidEmail(trimmedEmail)) {
    throw new Error("Please enter a valid work or personal email address.");
  }

  if (!password || password.length < 6) {
    throw new Error("Invalid email or password. Please verify your credentials.");
  }

  // 1. REAL SUPABASE AUTHENTICATION
  if (isSupabaseConfigured()) {
    const supabase = createBrowserSupabase();
    if (!supabase) {
      throw new Error("Supabase client failed to initialize.");
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        throw new Error("Invalid email or password. Please verify your credentials.");
      }
      if (error.message.includes("Email not confirmed")) {
        throw new Error("Your email address has not been confirmed yet. Please check your inbox for the verification link.");
      }
      throw new Error(error.message || "Authentication failed. Please try again.");
    }

    if (!data.user) {
      throw new Error("Authentication response did not return a valid user.");
    }

    const now = Date.now();
    const user: AuthUser = {
      id: data.user.id,
      name: data.user.user_metadata?.full_name || trimmedEmail.split("@")[0].replace(/[._-]/g, " "),
      email: trimmedEmail,
      role: "creator",
      planLabel: "Pro Member",
      isDemoSession: false,
      sessionCreatedAt: now,
      sessionExpiresAt: data.session?.expires_at ? data.session.expires_at * 1000 : now + SESSION_TTL_MS,
    };

    setStoredUser(user, remember);
    return user;
  }

  // 2. DEVELOPMENT MOCK FALLBACK
  await new Promise((resolve) => setTimeout(resolve, 600));

  const now = Date.now();
  const userName = trimmedEmail.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const user: AuthUser = {
    id: `dev_usr_${Math.random().toString(36).substring(2, 9)}`,
    name: userName || "Creator",
    email: trimmedEmail,
    role: "creator",
    planLabel: "Demo Workspace",
    isDemoSession: true,
    sessionCreatedAt: now,
    sessionExpiresAt: now + SESSION_TTL_MS,
  };

  setStoredUser(user, remember);
  return user;
}

/**
 * Registers user with Supabase Auth (or development mock fallback).
 */
export async function signupWithCredentials(
  name: string,
  email: string,
  password: string,
  agreeTerms: boolean,
  remember: boolean = true
): Promise<AuthUser> {
  const mode = getAuthMode();

  if (mode === "production_unconfigured") {
    throw new Error(
      "Account registration backend is not yet configured for production. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();

  if (!trimmedName || trimmedName.length < 2) {
    throw new Error("Please provide your full name or workspace name (at least 2 characters).");
  }

  if (!isValidEmail(trimmedEmail)) {
    throw new Error("Please enter a valid email address.");
  }

  const strength = evaluatePasswordStrength(password);
  if (!strength.isValid) {
    throw new Error("Password must be at least 8 characters long and contain both letters and numbers.");
  }

  if (!agreeTerms) {
    throw new Error("You must accept the terms of service and responsible AI guidelines to register.");
  }

  // 1. REAL SUPABASE REGISTRATION
  if (isSupabaseConfigured()) {
    const supabase = createBrowserSupabase();
    if (!supabase) {
      throw new Error("Supabase client failed to initialize.");
    }

    const callbackOrigin = typeof window !== "undefined" ? window.location.origin : "";
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          full_name: trimmedName,
        },
        emailRedirectTo: `${callbackOrigin}/auth/callback?next=/projects`,
      },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        throw new Error("An account with this email address already exists. Please sign in instead.");
      }
      throw new Error(error.message || "Registration failed. Please try again.");
    }

    if (!data.user) {
      throw new Error("Failed to create user account.");
    }

    const isEmailConfirmationPending = !data.session;
    const now = Date.now();
    const user: AuthUser = {
      id: data.user.id,
      name: trimmedName,
      email: trimmedEmail,
      role: "creator",
      planLabel: "Pro Member",
      isDemoSession: false,
      isEmailConfirmationPending,
      sessionCreatedAt: now,
      sessionExpiresAt: data.session?.expires_at ? data.session.expires_at * 1000 : now + SESSION_TTL_MS,
    };

    if (data.session) {
      setStoredUser(user, remember);
    }

    return user;
  }

  // 2. DEVELOPMENT MOCK REGISTRATION
  await new Promise((resolve) => setTimeout(resolve, 750));

  const now = Date.now();
  const user: AuthUser = {
    id: `dev_usr_${Math.random().toString(36).substring(2, 9)}`,
    name: trimmedName,
    email: trimmedEmail,
    role: "creator",
    planLabel: "Demo Workspace",
    isDemoSession: true,
    isEmailConfirmationPending: false,
    sessionCreatedAt: now,
    sessionExpiresAt: now + SESSION_TTL_MS,
  };

  setStoredUser(user, remember);
  return user;
}

/**
 * Initiates Supabase password recovery.
 */
export async function sendPasswordReset(email: string): Promise<PasswordResetResponse> {
  const mode = getAuthMode();

  if (mode === "production_unconfigured") {
    throw new Error("Password recovery service is not yet configured for this environment.");
  }

  const trimmedEmail = email.trim().toLowerCase();
  if (!isValidEmail(trimmedEmail)) {
    throw new Error("Please enter a valid email address.");
  }

  // 1. REAL SUPABASE PASSWORD RESET
  if (isSupabaseConfigured()) {
    const supabase = createBrowserSupabase();
    if (!supabase) {
      throw new Error("Supabase client failed to initialize.");
    }

    const callbackOrigin = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: `${callbackOrigin}/auth/callback?next=/projects`,
    });

    if (error) {
      throw new Error(error.message || "Failed to initiate password reset.");
    }

    return {
      success: true,
      isMock: false,
      message: "If an account exists with this email address, a password recovery link has been dispatched.",
    };
  }

  // 2. DEVELOPMENT MOCK EXPLANATION
  await new Promise((resolve) => setTimeout(resolve, 400));
  return {
    success: true,
    isMock: true,
    message: "In local prototype mode, password recovery emails cannot be delivered. Please use the development demo credentials to test the studio.",
  };
}

/**
 * Initiates Supabase OAuth authentication for Google or GitHub.
 */
export async function signInWithOAuth(provider: "google" | "github"): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      `${provider.toUpperCase()} OAuth requires configuring NEXT_PUBLIC_SUPABASE_URL, ANON_KEY, and provider credentials in your Supabase Dashboard.`
    );
  }

  const supabase = createBrowserSupabase();
  if (!supabase) {
    throw new Error("Supabase client failed to initialize.");
  }

  const callbackOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${callbackOrigin}/auth/callback?next=/projects`,
    },
  });

  if (error) {
    throw new Error(error.message || `Failed to initiate ${provider} authentication.`);
  }
}

/**
 * Performs sign-out from Supabase and clears local UI state.
 */
export async function logoutUser(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = createBrowserSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
  }
  clearStoredUser();
}
