/**
 * Supabase Client Configuration & Environment Validation
 */

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  const isPlaceholderUrl = Boolean(
    !url ||
    !url.startsWith("https://") ||
    url.includes("your-project") ||
    url.includes("example.supabase.co") ||
    url.includes("<") ||
    url.includes(">")
  );

  const isPlaceholderKey = Boolean(
    !anonKey ||
    anonKey.includes("your-anon-key") ||
    anonKey.includes("your-publishable") ||
    anonKey.includes("<") ||
    anonKey.includes(">") ||
    anonKey.length < 30
  );

  const isConfigured = !isPlaceholderUrl && !isPlaceholderKey;

  return {
    url: url || "",
    anonKey: anonKey || "",
    isConfigured,
  };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnv().isConfigured;
}

export function isServiceRoleConfigured(): boolean {
  const { isConfigured } = getSupabaseEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!isConfigured || !key) return false;
  return Boolean(
    !key.includes("your-service-role") &&
    !key.includes("<") &&
    !key.includes(">") &&
    key.length >= 30
  );
}
