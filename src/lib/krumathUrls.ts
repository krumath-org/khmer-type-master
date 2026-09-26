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
 * Query params that describe a single framework request rather than user
 * intent. Next.js adds `_rsc` to Router Cache prefetches, so it ends up on our
 * URL when KruMath links here; carrying it into `returnUrl` would replay a
 * dead cache key after sign-in.
 */
const TRANSIENT_QUERY_PARAMS = ["_rsc"];

/** Drop framework-transient params, preserving the rest of the search string. */
export function stripTransientQueryParams(searchStr: string): string {
  if (!searchStr) return "";
  try {
    const params = new URLSearchParams(
      searchStr.startsWith("?") ? searchStr.slice(1) : searchStr,
    );
    let changed = false;
    for (const key of TRANSIENT_QUERY_PARAMS) {
      if (params.has(key)) {
        params.delete(key);
        changed = true;
      }
    }
    if (!changed) return searchStr;
    const rest = params.toString();
    return rest ? `?${rest}` : "";
  } catch {
    return searchStr;
  }
}

/**
 * Public path including the router search string, e.g.
 * `publicAppHref("/", "?level=3&lesson=x")` -> `/khmer-typing-master?level=3&lesson=x`.
 * Used to preserve deep-link intent across the KruMath sign-in round trip.
 * Framework-transient params (e.g. `_rsc`) are stripped.
 */
export function publicAppHref(routerPathname: string, searchStr = ""): string {
  const base = publicAppPath(routerPathname);
  const search = stripTransientQueryParams(searchStr);
  return search ? `${base}${search}` : base;
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
