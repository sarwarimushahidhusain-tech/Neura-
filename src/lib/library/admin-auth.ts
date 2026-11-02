/**
 * NEURA PHASE 5 — ADMIN AUTHORIZATION & SECURITY
 * Server-side authorization guards to ensure only authorized administrators
 * can upload, publish, edit, or delete educational library videos.
 */

import { getServerUser, createClient as createServerSupabase, createAdminClient } from "@/lib/supabase/server";
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
 * Returns list of configured admin email addresses from environment.
 * Does NOT auto-fallback to hardcoded emails if unconfigured.
 */
export function getConfiguredAdminEmails(): string[] {
  const envAdmins = process.env.ADMIN_EMAILS || "";
  return envAdmins
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
}

/**
 * Checks whether an email address is in the configured administrator allowlist.
 */
export function isEmailAdmin(email?: string | null): boolean {
  if (!email) return false;
  const adminEmails = getConfiguredAdminEmails();
  if (adminEmails.length === 0) return false;
  return adminEmails.includes(email.toLowerCase().trim());
}

/**
 * Evaluates whether a given user holds administrator privileges.
 * Server-verified checks:
 * 1. ADMIN_EMAILS environment allowlist
 * 2. Supabase app_metadata.role === 'admin' (tamper-proof, set only via service role/dashboard)
 * 3. Supabase public.user_roles table entry (role = 'admin')
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

  // Check 1: Explicit server-side email allowlist
  if (user.email && isEmailAdmin(user.email)) {
    return true;
  }

  // Check 2: Supabase app_metadata (cannot be written by client users)
  if (user.app_metadata && user.app_metadata.role === "admin") {
    return true;
  }

  // Check 3: Query public.user_roles in Supabase
  if (isSupabaseConfigured()) {
    try {
      const adminClient = createAdminClient();
      const supabase = adminClient || (await createServerSupabase());
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
      // In case query fails, fail closed
    }
  }

  return false;
}

/**
 * Server-side guard for Route Handlers and Server Actions.
 * Strict least-privilege verification:
 * - Never auto-authorizes unauthenticated requests in development or production.
 * - Rejects arbitrary client headers (e.g. x-admin-email, client role overrides).
 * - Verifies real session via getServerUser() or explicit server ADMIN_API_KEY.
 * - Fails closed with 503 if administrative configuration is missing.
 */
export async function verifyAdminRequest(req?: Request): Promise<AdminAuthResult> {
  // Check 1: Server-to-server API Key (if explicitly configured in environment)
  const configuredApiKey = process.env.ADMIN_API_KEY?.trim();
  if (req && configuredApiKey && configuredApiKey.length >= 16) {
    const authHeader = req.headers.get("authorization") || "";
    if (authHeader === `Bearer ${configuredApiKey}`) {
      return {
        authorized: true,
        user: { id: "server-admin-key", email: "admin@system.local", role: "admin" },
        status: 200,
      };
    }
  }

  // Check 2: Authenticated Supabase session
  if (isSupabaseConfigured()) {
    const user = await getServerUser();
    if (!user) {
      return {
        authorized: false,
        error: "Authentication required. Please sign in with an authorized administrator account.",
        status: 401,
      };
    }

    const isAdmin = await verifyUserIsAdmin(user);
    if (!isAdmin) {
      return {
        authorized: false,
        error: "Forbidden. Your account does not have administrator privileges.",
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

  // If configuration is missing, fail closed and provide a clear setup error
  return {
    authorized: false,
    error: "Admin authentication service is unconfigured. Supabase credentials and ADMIN_EMAILS (or ADMIN_API_KEY) must be configured in .env.local to access administrator features.",
    status: 503,
  };
}
