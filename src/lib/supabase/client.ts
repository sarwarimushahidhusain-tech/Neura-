import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./config";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Creates or retrieves the singleton browser-side Supabase client.
 * Returns null if Supabase environment variables are unconfigured.
 */
export function createClient() {
  const { url, anonKey, isConfigured } = getSupabaseEnv();

  if (!isConfigured) {
    return null;
  }

  if (!browserClient) {
    browserClient = createBrowserClient(url, anonKey);
  }

  return browserClient;
}
