import { createServerClient } from "@supabase/ssr";
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
