import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";

import { isPlayableUser, shouldBlock, toAuthUser } from "@/lib/authUser";
import {
  getKrumathCookieDomain,
  getKrumathSupabaseCookieOptions,
  mergeKrumathCookieOptions,
} from "@/lib/krumathCookies";
import { publicAppHref, publicAppPath, signInUrl } from "@/lib/krumathUrls";

function makeUser(overrides: { is_anonymous?: boolean; email?: string | null } = {}): User {
  return {
    id: "user-1",
    email: "kru@krumath.com",
    is_anonymous: false,
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
    expect(toAuthUser(makeUser())).toEqual({ id: "user-1", email: "kru@krumath.com" });
  });

  it("returns null for no session or anonymous sessions", () => {
    expect(toAuthUser(null)).toBeNull();
    expect(toAuthUser(makeUser({ is_anonymous: true }))).toBeNull();
  });

  it("coerces a missing email to null", () => {
    expect(toAuthUser(makeUser({ email: null }))).toEqual({ id: "user-1", email: null });
  });
});

describe("shared session cookies (spec section 10)", () => {
  it("shares cookies on krumath.com and its subdomains", () => {
    expect(getKrumathCookieDomain("krumath.com")).toBe(".krumath.com");
    expect(getKrumathCookieDomain("app.krumath.com")).toBe(".krumath.com");
  });

  it("does not share on localhost or lookalike hosts", () => {
    expect(getKrumathCookieDomain("localhost")).toBeUndefined();
    expect(getKrumathCookieDomain("notkrumath.com")).toBeUndefined();
    expect(getKrumathCookieDomain(undefined)).toBeUndefined();
  });

  it("uses root path, lax and secure on production hosts", () => {
    expect(getKrumathSupabaseCookieOptions("krumath.com", true)).toEqual({
      domain: ".krumath.com",
      path: "/",
      sameSite: "lax",
      secure: true,
    });
  });

  it("omits domain where sharing is not possible", () => {
    const localOnly: { path: string; domain?: string } = { path: "/" };
    expect(getKrumathSupabaseCookieOptions("localhost", false)).toBeUndefined();
    expect(mergeKrumathCookieOptions(localOnly, "localhost")).toEqual({ path: "/" });
    expect(mergeKrumathCookieOptions(localOnly, "krumath.com")).toEqual({
      path: "/",
      domain: ".krumath.com",
    });
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
