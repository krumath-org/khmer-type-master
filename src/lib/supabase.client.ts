import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient, User } from "@supabase/supabase-js";

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
 * Storage is the shared KruMath session in `localStorage` — NOT `@supabase/ssr`
 * cookies. KruMath's main web app persists its session with a plain
 * `createClient(..., { auth: { storage: localStorage } })`
 * (see `KruMath/apps/web/src/config/supabase-browser.ts`), so nothing ever
 * writes an `sb-*-auth-token` cookie on `krumath.com`.
 *
 * `localStorage` is scoped per origin, not per path, and this app is served
 * from `krumath.com/khmer-typing-master` — the same origin as
 * `krumath.com/home`. Leaving the default `storageKey` untouched is what lets
 * us read the exact same session the main app wrote.
 *
 * A single instance keeps session state and `onAuthStateChange` listeners
 * consistent across the app.
 *
 * Client-only: call this from effects/handlers, never during SSR. Import it
 * dynamically (`await import("@/lib/supabase.client")`) from modules that SSR
 * so TanStack Start import protection keeps it out of the server graph.
 */
export function getSupabaseBrowserClient(): BrowserClient {
  if (browserClient) return browserClient;

  browserClient = createClient(supabaseUrl(), supabaseAnonKey(), {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // KruMath owns the auth callback flow; this app never processes auth URLs.
      detectSessionInUrl: false,
    },
  });
  return browserClient;
}

export async function getBrowserUser(): Promise<User | null> {
  const { data } = await getSupabaseBrowserClient().auth.getUser();
  return data.user ?? null;
}
