import type { User } from "@supabase/supabase-js";

/** Minimal, serializable account shape the UI and server function exchange. */
export type AuthUser = {
  id: string;
  email: string | null;
};

/** Same rule as KruMath RequireLoggedIn: reject missing and anonymous users. */
export function isPlayableUser(user: User | null): boolean {
  if (!user) return false;
  if (user.is_anonymous) return false;
  return true;
}

/**
 * Inverse of {@link isPlayableUser}, expressed as the gate decision.
 * A block is required when there is no session, an anonymous session, or an
 * expired/invalid session (spec section 7).
 */
export function shouldBlock(user: User | null): boolean {
  return !isPlayableUser(user);
}

/** Map a Supabase user to the minimal shape the UI needs (null when not playable). */
export function toAuthUser(user: User | null): AuthUser | null {
  if (!isPlayableUser(user) || !user) return null;
  return { id: user.id, email: user.email ?? null };
}
