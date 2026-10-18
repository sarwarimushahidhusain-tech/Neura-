import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "./config";

/**
 * Refreshes auth tokens stored in cookies and updates response headers.
 * If Supabase is unconfigured, cleanly passes the request through.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const { url, anonKey, isConfigured } = getSupabaseEnv();

  if (!isConfigured) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: calling getUser() refreshes the session token if expired.
  // Do NOT use getSession() as it cannot be guaranteed to be authentic on the server.
  await supabase.auth.getUser();

  return supabaseResponse;
}
