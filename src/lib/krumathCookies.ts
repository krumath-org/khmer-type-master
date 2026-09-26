/**
 * KruMath shared-session contract.
 *
 * IMPORTANT: KruMath's main web app (`krumath.com`) keeps its Supabase session
 * in `localStorage`, not in `@supabase/ssr` cookies — see
 * `KruMath/apps/web/src/config/supabase-browser.ts`:
 *
 *   "Session persistence: localStorage (atomic, sync) — NOT @supabase/ssr cookies."
 *
 * The only cookie it exposes is the `km_session` presence marker, set by
 * `KruMath/apps/web/src/contexts/AuthContext.tsx` on sign-in and cleared on
 * logout. KruMath's own middleware gates `/dashboard` and `/settings` on that
 * marker (plus any `sb-*-auth-token` cookie, which is absent on `krumath.com`).
 */

/** Presence marker cookie name — must match KruMath's `AuthContext`. */
export const KRUMATH_SESSION_MARKER_COOKIE = "km_session";

/** Marker lifetime used by KruMath (`Max-Age=2592000`, i.e. 30 days). */
export const KRUMATH_SESSION_MARKER_MAX_AGE = 2592000;

/**
 * Shared auth cookie domain for production `krumath.com` ↔ `learn.krumath.com`
 * SSO. Returns `undefined` on localhost and non-KruMath hosts so cookies stay
 * host-only.
 */
export function getKrumathCookieDomain(hostname: string | undefined | null): string | undefined {
  if (!hostname) return undefined;
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) return undefined;
  if (host === "krumath.com" || host.endsWith(".krumath.com")) return ".krumath.com";
  return undefined;
}

/**
 * `document.cookie` assignment that clears the KruMath presence marker.
 *
 * Mirrors the exact attributes KruMath uses when clearing it
 * (`Path=/; Max-Age=0; SameSite=Lax` plus the shared domain), so the deletion
 * targets the same cookie rather than creating a host-only shadow.
 */
export function clearKrumathSessionMarker(hostname: string | undefined | null): string {
  const domain = getKrumathCookieDomain(hostname);
  const domainAttr = domain ? `; Domain=${domain}` : "";
  return `${KRUMATH_SESSION_MARKER_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${domainAttr}`;
}
