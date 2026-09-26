const DEFAULT_HOME = "https://krumath.com/home";
const DEFAULT_PRICING = "https://krumath.com/pricing";

export const GITHUB_REPO_URL = "https://github.com/krumath-org/khmer-type-master";

export function krumathHomeUrl(): string {
  const origin = import.meta.env.VITE_KRUMATH_ORIGIN as string | undefined;
  if (origin && origin.length > 0) {
    return `${origin.replace(/\/$/, "")}/home`;
  }
  return DEFAULT_HOME;
}

export function krumathPricingUrl(): string {
  const origin = import.meta.env.VITE_KRUMATH_ORIGIN as string | undefined;
  if (origin && origin.length > 0) {
    return `${origin.replace(/\/$/, "")}/pricing`;
  }
  return DEFAULT_PRICING;
}

/** Public path on krumath.com (Vite `base` + in-app route). */
export function publicAppPath(routerPath: string): string {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const path = routerPath === "/" ? "" : routerPath.startsWith("/") ? routerPath : `/${routerPath}`;
  return `${base}${path}` || "/";
}

/**
 * Public path including the router search string, e.g.
 * `publicAppHref("/", "?level=3&lesson=x")` -> `/khmer-typing-master?level=3&lesson=x`.
 * Used to preserve deep-link intent across the KruMath sign-in round trip.
 */
export function publicAppHref(routerPathname: string, searchStr = ""): string {
  const base = publicAppPath(routerPathname);
  return searchStr ? `${base}${searchStr}` : base;
}

export function signInUrl(returnPath: string): string {
  const path = returnPath.startsWith("/") ? returnPath : `/${returnPath}`;
  const query = `returnUrl=${encodeURIComponent(path)}`;
  const origin = import.meta.env.VITE_KRUMATH_ORIGIN as string | undefined;
  if (origin && origin.length > 0) {
    return `${origin.replace(/\/$/, "")}/sign-in?${query}`;
  }
  return `/sign-in?${query}`;
}
