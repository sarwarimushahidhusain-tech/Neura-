import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeRedirectUrl } from "@/lib/auth-utils";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const errorParam = searchParams.get("error");
  const errorDesc = searchParams.get("error_description");

  const safeRedirectPath = sanitizeRedirectUrl(next, "/projects");

  if (errorParam) {
    const message = encodeURIComponent(errorDesc || errorParam);
    return NextResponse.redirect(`${origin}/login?error=${message}`);
  }

  if (code) {
    const supabase = await createClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${safeRedirectPath}`);
      }
    }
  }

  // If code exchange failed or unconfigured, redirect to login with error indicator
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
