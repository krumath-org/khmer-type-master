import { useCallback, useEffect, useState } from "react";
import { createClientOnlyFn } from "@tanstack/react-start";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

import { toAuthUser, type AuthUser } from "@/lib/authUser";
import { publicAppPath, signInUrl } from "@/lib/krumathUrls";

export type { AuthUser };

export type UseAuthResult = {
  user: AuthUser | null;
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
});

/**
 * Client-side auth state for the account menu.
 *
 * Seeded with the server-resolved user so there is no signed-out flash, then
 * kept in sync via `onAuthStateChange` (shared `.krumath.com` cookies).
 * Signing out calls the shared Supabase `signOut()`, which also signs the user
 * out of KruMath (spec section 11), then leaves the hard-gated app.
 */
export function useAuth(initialUser: AuthUser | null): UseAuthResult {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      try {
        const current = await readCurrentUser();
        if (!cancelled) setUser(current);

        unsubscribe = await subscribeToAuthChanges((next) => {
          if (!cancelled) setUser(next);
        });
      } catch {
        // Missing config or a transient auth error: keep the server-resolved user
        // so the account menu still renders and logout remains available.
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

  return { user, signingOut, signOut };
}
