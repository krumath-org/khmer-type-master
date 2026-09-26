import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import { getKrumathSupabaseCookieOptions } from "@/lib/krumathCookies";

function supabaseUrl(): string {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!url) throw new Error("Missing VITE_SUPABASE_URL");
  return url;
}

function supabaseAnonKey(): string {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!key) throw new Error("Missing VITE_SUPABASE_ANON_KEY");
  return key;
}

type BrowserClient = SupabaseClient;

let browserClient: BrowserClient | undefined;

/**
 * Memoized browser Supabase client.
 *
 * A single instance keeps session cookies and `onAuthStateChange` listeners
 * consistent across the app. Building a new client per call (as the previous
 * `getBrowserUser` did) also caused redundant cookie churn.
 *
 * Client-only: call this from effects/handlers, never during SSR. Import it
 * dynamically (`await import("@/lib/supabase.client")`) from modules that SSR
 * so TanStack Start import protection keeps it out of the server graph.
 */
export function getSupabaseBrowserClient(): BrowserClient {
  if (browserClient) return browserClient;

  const hostname = window.location.hostname;
  const cookieOptions = getKrumathSupabaseCookieOptions(
    hostname,
    window.location.protocol === "https:",
  );

  browserClient = createBrowserClient(
    supabaseUrl(),
    supabaseAnonKey(),
    cookieOptions ? { cookieOptions } : undefined,
  );
  return browserClient;
}

export async function getBrowserUser(): Promise<User | null> {
  const { data } = await getSupabaseBrowserClient().auth.getUser();
  return data.user ?? null;
}
