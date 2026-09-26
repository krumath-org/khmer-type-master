import { useCallback, useEffect, useState } from "react";
import { createClientOnlyFn } from "@tanstack/react-start";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

import { toAuthUser, type AuthUser } from "@/lib/authUser";
import { clearKrumathSessionMarker } from "@/lib/krumathCookies";
import { publicAppPath, signInUrl } from "@/lib/krumathUrls";

export type { AuthUser };

export type UseAuthResult = {
  user: AuthUser | null;
  /**
   * True until the browser has verified the shared session. The caller must not
   * treat `user === null` as "signed out" while this is still true.
   */
  checking: boolean;
  signingOut: boolean;
  signOut: () => Promise<void>;
};

/**
 * `.client` modules are import-protected on the server, so every browser-client
 * touch point is wrapped in `createClientOnlyFn` (the pattern the TanStack Start
 * plugin recognises). These are only invoked from effects/handlers.
 */
const readCurrentUser = createClientOnlyFn(async (): Promise<AuthUser | null> => {
  const { getSupabaseBrowserClient } = await import("@/lib/supabase.client");
  const { data } = await getSupabaseBrowserClient().auth.getUser();
  return toAuthUser(data.user);
});

const subscribeToAuthChanges = createClientOnlyFn(
  async (onChange: (user: AuthUser | null) => void): Promise<() => void> => {
    const { getSupabaseBrowserClient } = await import("@/lib/supabase.client");
    const supabase = getSupabaseBrowserClient();
    const { data } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        onChange(toAuthUser(session?.user ?? null));
      },
    );
    return () => data.subscription.unsubscribe();
  },
);

const signOutSharedSession = createClientOnlyFn(async (): Promise<void> => {
  const { getSupabaseBrowserClient } = await import("@/lib/supabase.client");
  await getSupabaseBrowserClient().auth.signOut();
  // The server gate can only see KruMath's presence marker, so clear it here
  // too — otherwise KruMath's middleware would still consider us signed in
  // (spec section 11, logout synchronization).
  document.cookie = clearKrumathSessionMarker(window.location.hostname);
});

/**
 * Client-side auth state for the account menu and the hard gate.
 *
 * This is the AUTHORITATIVE check. KruMath stores its Supabase session in
 * `localStorage`, which the server cannot read, so `beforeLoad` can only assert
 * that a session marker exists; here we read the real session (same origin,
 * same `sb-<ref>-auth-token` key) and expose `checking` so the caller can wait
 * before redirecting.
 *
 * Signing out calls the shared Supabase `signOut()`, which clears the session
 * the main app reads, then the KruMath presence marker.
 */
export function useAuth(initialUser: AuthUser | null): UseAuthResult {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [checking, setChecking] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      try {
        const current = await readCurrentUser();
        if (cancelled) return;
        setUser(current);

        unsubscribe = await subscribeToAuthChanges((next) => {
          if (!cancelled) setUser(next);
        });
      } catch {
        // Missing config or a transient auth error. Leave `user` as-is; the
        // caller decides whether to gate on the unresolved state.
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const signOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await signOutSharedSession();
    } catch {
      // Even if the network call fails, leave the app rather than show a stale session.
    } finally {
      // Hard gate: the app is unusable signed out, so return to KruMath sign-in.
      window.location.assign(signInUrl(publicAppPath("/")));
    }
  }, []);

  return { user, checking, signingOut, signOut };
}
