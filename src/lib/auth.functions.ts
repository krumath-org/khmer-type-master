import { createServerFn } from "@tanstack/react-start";

import { isPlayableUser, type AuthUser } from "@/lib/authUser";

export type { AuthUser };

export type AuthState = {
  signedIn: boolean;
  user: AuthUser | null;
};

/**
 * Server-side KruMath auth check.
 *
 * Reads the shared Supabase session from the `.krumath.com` cookies and rejects
 * missing/anonymous sessions (spec sections 7 and 8). Runs during SSR so a hard
 * gate protects the whole app before any HTML is rendered.
 */
export const getAuthState = createServerFn({ method: "GET" }).handler(
  async (): Promise<AuthState> => {
    const { getServerUser } = await import("@/lib/supabase.server");
    const user = await getServerUser();

    if (!isPlayableUser(user) || !user) {
      return { signedIn: false, user: null };
    }

    return {
      signedIn: true,
      user: { id: user.id, email: user.email ?? null },
    };
  },
);
