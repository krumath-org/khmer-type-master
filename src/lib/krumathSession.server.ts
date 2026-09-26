import { getCookies } from "@tanstack/react-start/server";

import { KRUMATH_SESSION_MARKER_COOKIE } from "@/lib/krumathCookies";

/**
 * Server-side presence check for the shared KruMath session.
 *
 * This is deliberately NOT a cryptographic check. KruMath stores the real
 * Supabase session in `localStorage`, which the server cannot read, so the only
 * server-visible signal is the `km_session` presence marker cookie that
 * KruMath's `AuthContext` sets on sign-in and clears on logout.
 *
 * KruMath's own middleware gates `/dashboard` and `/settings` on exactly this
 * cookie, so we are matching the platform's established contract. The
 * authoritative playable-user check runs in the browser (`useAuth` reads the
 * real session and redirects when it is missing or anonymous), and every
 * database read/write is additionally protected by RLS keyed to `auth.uid()`.
 *
 * A forged marker therefore only reaches an empty app shell — never another
 * user's data.
 */
export function hasKrumathSessionMarker(): boolean {
  const cookies = getCookies();
  const value = cookies[KRUMATH_SESSION_MARKER_COOKIE];
  return typeof value === "string" && value.length > 0;
}
