import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./config";

/**
 * Creates a server-side Supabase client for Server Components, Server Actions,
 * and Route Handlers using Next.js 16 async cookies API.
 * Returns null if Supabase environment variables are unconfigured.
 */
export async function createClient() {
  const { url, anonKey, isConfigured } = getSupabaseEnv();

  if (!isConfigured) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This is expected and safe when middleware handles session refresh.
        }
      },
    },
  });
}

/**
 * Creates a server-only Supabase client using the service-role key.
 * Used exclusively for trusted server-side administrative operations
 * (e.g., generating short-lived signed URLs for private videos).
 * NEVER expose this client or the service role key to the browser.
 */
export function createAdminClient() {
  const { url, isConfigured } = getSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!isConfigured || !serviceRoleKey || serviceRoleKey.includes("your-service-role") || serviceRoleKey.length < 30) {
    return null;
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Server-side helper to get the authenticated user securely from Supabase.
 * Returns null if unauthenticated, invalid, or unconfigured.
 */
export async function getServerUser() {
  const supabase = await createClient();
  if (!supabase) return null;

  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}
