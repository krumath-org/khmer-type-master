import type { User } from "@supabase/supabase-js";

/** Minimal, serializable account shape the UI and server function exchange. */
export type AuthUser = {
  id: string;
  email: string | null;
  /**
   * Human-friendly name for the account control. Already resolved by
   * {@link resolveDisplayName}, so it may be an OAuth profile name, a KruMath
   * profile name, or the email local part as a last resort. Null only when the
   * account exposes neither a name nor an email.
   */
  name: string | null;
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

/** Metadata keys KruMath populates for a display name, in priority order. */
const NAME_METADATA_KEYS = ["name", "full_name"] as const;

/**
 * Preferred display name for a KruMath account.
 *
 * Mirrors KruMath's own precedence in `AuthContext#buildAppUser`: the profile
 * `name`, then `full_name`, then the email local part. The email fallback keeps
 * the account control readable for accounts that never set a name, instead of
 * leaving it blank.
 */
export function resolveDisplayName(user: User | null): string | null {
  if (!user) return null;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  for (const key of NAME_METADATA_KEYS) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  const email = user.email?.trim();
  if (email) {
    const localPart = email.split("@")[0]?.trim();
    if (localPart) return localPart;
  }

  return null;
}

/** Map a Supabase user to the minimal shape the UI needs (null when not playable). */
export function toAuthUser(user: User | null): AuthUser | null {
  if (!isPlayableUser(user) || !user) return null;
  return {
    id: user.id,
    email: user.email ?? null,
    name: resolveDisplayName(user),
  };
}
