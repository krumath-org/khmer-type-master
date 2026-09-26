import { createServerFn } from "@tanstack/react-start";

import type { AuthUser } from "@/lib/authUser";

export type { AuthUser };

export type AuthState = {
  /** True when a shared KruMath session marker was present on the request. */
  signedIn: boolean;
  /**
   * Always `null` from the server. The real Supabase session lives in
   * `localStorage`, which is unreadable during SSR, so identity is resolved in
   * the browser by `useAuth`.
   */
  user: AuthUser | null;
};

/**
 * Server-side KruMath session presence check (spec sections 7-9).
 *
 * Runs during SSR so the hard gate can redirect before any HTML is rendered.
 * It can only assert *presence* — KruMath keeps the real Supabase session in
 * `localStorage` and exposes just the `km_session` marker cookie — so the
 * authoritative playable-user check runs in the browser via `useAuth`.
 *
 * See `src/lib/krumathSession.server.ts` for the full rationale.
 */
export const getAuthState = createServerFn({ method: "GET" }).handler(
  async (): Promise<AuthState> => {
    const { hasKrumathSessionMarker } = await import("@/lib/krumathSession.server");
    return { signedIn: hasKrumathSessionMarker(), user: null };
  },
);
