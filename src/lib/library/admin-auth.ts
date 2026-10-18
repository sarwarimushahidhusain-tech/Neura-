/**
 * NEURA PHASE 5 — ADMIN AUTHORIZATION & SECURITY
 * Server-side authorization guards to ensure only authorized administrators
 * can upload, publish, edit, or delete educational library videos.
 */

import { getServerUser, createClient as createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export interface AdminAuthResult {
  authorized: boolean;
  user?: {
    id: string;
    email: string;
    role?: string;
  };
  error?: string;
  status: number;
}

/**
 * Returns list of configured admin email addresses.
 */
export function getConfiguredAdminEmails(): string[] {
  const envAdmins = process.env.ADMIN_EMAILS || "";
  const parsed = envAdmins
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);

  // Default fallback admin for testing/development
  if (parsed.length === 0 && process.env.NODE_ENV !== "production") {
    return ["admin@neura.ai", "admin@neura.local"];
  }

  return parsed;
}

/**
 * Checks whether an email address is an authorized administrator.
 */
export function isEmailAdmin(email?: string | null): boolean {
  if (!email) return false;
  const adminEmails = getConfiguredAdminEmails();
  return adminEmails.includes(email.toLowerCase().trim());
}

/**
 * Evaluates whether a given user holds administrator privileges.
 * Checks:
 * 1. ADMIN_EMAILS environment allowlist
 * 2. Supabase app_metadata.role === 'admin'
 * 3. Supabase public.user_roles table entry
 */
export async function verifyUserIsAdmin(user: {
  id: string;
  email?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
} | null): Promise<boolean> {
  if (!user || !user.id) {
    return false;
  }

  // Check 1: Explicit email allowlist
  if (user.email && isEmailAdmin(user.email)) {
    return true;
  }

  // Check 2: Supabase app_metadata (secure, cannot be written by users)
  if (user.app_metadata && user.app_metadata.role === "admin") {
    return true;
  }

  // Check 3: Query public.user_roles in Supabase
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabase();
      if (supabase) {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!error && data && data.role === "admin") {
          return true;
        }
      }
    } catch {
      // In case table or query fails, fall through safely
    }
  }

  return false;
}

/**
 * Server-side guard for Route Handlers. Inspects request session/cookies
 * and returns authorization status.
 */
export async function verifyAdminRequest(req?: Request): Promise<AdminAuthResult> {
  // If Supabase is configured, check authenticated session
  if (isSupabaseConfigured()) {
    const user = await getServerUser();
    if (!user) {
      return {
        authorized: false,
        error: "Authentication required. Please log in to access admin capabilities.",
        status: 401,
      };
    }

    const isAdmin = await verifyUserIsAdmin(user);
    if (!isAdmin) {
      return {
        authorized: false,
        error: "Forbidden. Only authorized administrators can perform this action.",
        status: 403,
      };
    }

    return {
      authorized: true,
      user: {
        id: user.id,
        email: user.email || "",
        role: "admin",
      },
      status: 200,
    };
  }

  // Development fallback when Supabase is not configured (offline / prototype mode)
  // Check authorization header or dev cookie
  if (req) {
    const authHeader = req.headers.get("authorization") || "";
    const adminKey = process.env.ADMIN_API_KEY;

    if (adminKey && authHeader === `Bearer ${adminKey}`) {
      return {
        authorized: true,
        user: { id: "dev-admin-id", email: "admin@neura.ai", role: "admin" },
        status: 200,
      };
    }

    // Check dev-admin-session header in mock development
    const devAdminEmail = req.headers.get("x-admin-email");
    if (devAdminEmail && isEmailAdmin(devAdminEmail)) {
      return {
        authorized: true,
        user: { id: "dev-admin-header", email: devAdminEmail, role: "admin" },
        status: 200,
      };
    }
  }

  // If in non-production and demo auth is allowed, allow dev admin for local testing
  if (process.env.NODE_ENV !== "production") {
    return {
      authorized: true,
      user: {
        id: "dev-mock-admin-01",
        email: "admin@neura.ai",
        role: "admin",
      },
      status: 200,
    };
  }

  return {
    authorized: false,
    error: "Unauthorized: Supabase is unconfigured and production restrictions are active.",
    status: 401,
  };
}
