import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";

import { isPlayableUser, resolveDisplayName, shouldBlock, toAuthUser } from "@/lib/authUser";
import {
  clearKrumathSessionMarker,
  getKrumathCookieDomain,
  KRUMATH_SESSION_MARKER_COOKIE,
} from "@/lib/krumathCookies";
import {
  publicAppHref,
  publicAppPath,
  signInUrl,
  stripTransientQueryParams,
} from "@/lib/krumathUrls";

function makeUser(
  overrides: {
    is_anonymous?: boolean;
    email?: string | null;
    user_metadata?: Record<string, unknown> | null;
  } = {},
): User {
  return {
    id: "user-1",
    email: "kru@krumath.com",
    is_anonymous: false,
    user_metadata: {},
    ...overrides,
  } as User;
}

describe("auth gate rule (spec section 7)", () => {
  it("blocks when there is no session", () => {
    expect(isPlayableUser(null)).toBe(false);
    expect(shouldBlock(null)).toBe(true);
  });

  it("blocks anonymous sessions", () => {
    const anonymous = makeUser({ is_anonymous: true });
    expect(isPlayableUser(anonymous)).toBe(false);
    expect(shouldBlock(anonymous)).toBe(true);
  });

  it("accepts a real non-anonymous session", () => {
    const user = makeUser();
    expect(isPlayableUser(user)).toBe(true);
    expect(shouldBlock(user)).toBe(false);
  });
});

describe("toAuthUser", () => {
  it("maps a playable user to the serializable shape", () => {
    expect(toAuthUser(makeUser())).toEqual({
      id: "user-1",
      email: "kru@krumath.com",
      name: "kru",
    });
  });

  it("returns null for no session or anonymous sessions", () => {
    expect(toAuthUser(null)).toBeNull();
    expect(toAuthUser(makeUser({ is_anonymous: true }))).toBeNull();
  });

  it("coerces a missing email to null", () => {
    expect(toAuthUser(makeUser({ email: null }))).toEqual({
      id: "user-1",
      email: null,
      name: null,
    });
  });
});

describe("resolveDisplayName", () => {
  it("prefers the profile name over everything else", () => {
    const user = makeUser({
      email: "kru@krumath.com",
      user_metadata: { name: "Kru Sok", full_name: "Sok Kru" },
    });
    expect(resolveDisplayName(user)).toBe("Kru Sok");
  });

  it("falls back to full_name when name is absent", () => {
    const user = makeUser({ user_metadata: { full_name: "Sok Kru" } });
    expect(resolveDisplayName(user)).toBe("Sok Kru");
  });

  it("ignores blank metadata values", () => {
    const user = makeUser({ user_metadata: { name: "   ", full_name: "Sok Kru" } });
    expect(resolveDisplayName(user)).toBe("Sok Kru");
  });

  it("falls back to the email local part", () => {
    expect(resolveDisplayName(makeUser({ user_metadata: {} }))).toBe("kru");
    expect(resolveDisplayName(makeUser({ user_metadata: null }))).toBe("kru");
  });

  it("returns null when there is neither a name nor an email", () => {
    expect(resolveDisplayName(makeUser({ email: null }))).toBeNull();
    expect(resolveDisplayName(null)).toBeNull();
  });
});

describe("shared session contract (spec section 10)", () => {
  it("mirrors KruMath's marker cookie name", () => {
    expect(KRUMATH_SESSION_MARKER_COOKIE).toBe("km_session");
  });

  it("shares the cookie domain on krumath.com and its subdomains", () => {
    expect(getKrumathCookieDomain("krumath.com")).toBe(".krumath.com");
    expect(getKrumathCookieDomain("app.krumath.com")).toBe(".krumath.com");
  });

  it("does not share on localhost or lookalike hosts", () => {
    expect(getKrumathCookieDomain("localhost")).toBeUndefined();
    expect(getKrumathCookieDomain("notkrumath.com")).toBeUndefined();
    expect(getKrumathCookieDomain(undefined)).toBeUndefined();
  });

  it("clears the marker with the same attributes KruMath uses", () => {
    expect(clearKrumathSessionMarker("krumath.com")).toBe(
      "km_session=; Path=/; Max-Age=0; SameSite=Lax; Domain=.krumath.com",
    );
    expect(clearKrumathSessionMarker("localhost")).toBe(
      "km_session=; Path=/; Max-Age=0; SameSite=Lax",
    );
  });
});

describe("sign-in URL (spec section 9)", () => {
  beforeEach(() => {
    // Keep expectations relative regardless of a developer's local .env.
    vi.stubEnv("VITE_KRUMATH_ORIGIN", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the exact returnUrl parameter and no other redirect names", () => {
    const href = signInUrl(publicAppPath("/"));
    expect(href.startsWith("/sign-in?")).toBe(true);
    expect(href).toContain("returnUrl=");
    expect(href).not.toMatch(/returnTo=|redirectUrl=|redirect=|next=/);
  });

  it("URL-encodes a same-origin path that preserves search (deep links)", () => {
    const returnPath = publicAppHref("/", "?level=3&lesson=x");
    expect(returnPath).toBe(`${publicAppPath("/")}?level=3&lesson=x`);
    expect(signInUrl(returnPath)).toBe(`/sign-in?returnUrl=${encodeURIComponent(returnPath)}`);
  });

  it("never produces a protocol-relative or external returnUrl", () => {
    const href = signInUrl(publicAppPath("/"));
    const value = decodeURIComponent(href.split("returnUrl=")[1] ?? "");
    expect(value.startsWith("/")).toBe(true);
    expect(value.startsWith("//")).toBe(false);
    expect(value).not.toContain("://");
  });
});

describe("transient query params", () => {
  it("drops Next.js Router Cache prefetch keys", () => {
    expect(stripTransientQueryParams("?_rsc=kljkh")).toBe("");
    expect(publicAppHref("/", "?_rsc=kljkh")).toBe(publicAppPath("/"));
  });

  it("keeps real deep-link intent while dropping transient params", () => {
    const stripped = stripTransientQueryParams("?level=3&lesson=x&_rsc=abc");
    expect(stripped).toContain("level=3");
    expect(stripped).toContain("lesson=x");
    expect(stripped).not.toContain("_rsc");

    const href = publicAppHref("/", "?level=3&lesson=x&_rsc=abc");
    expect(href).not.toContain("_rsc");
    expect(decodeURIComponent(signInUrl(href))).toContain("level=3");
  });

  it("is a no-op when nothing is transient", () => {
    expect(stripTransientQueryParams("")).toBe("");
    expect(stripTransientQueryParams("?level=3")).toBe("?level=3");
  });
});
