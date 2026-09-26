# Handoff — Khmer Type Master → KruMath

The independent-side handoff block required by section 20 of the KruMath integration
specification, plus the section 23 verification status.

## Handoff block

```text
Project name: Khmer Type Master
Project slug: khmer-typing-master
GitHub repository: https://github.com/krumath-org/khmer-type-master
Cloudflare Worker name: khmer-typing-master
Production URL: https://krumath.com/khmer-typing-master
Authentication model: Hard gate (SSR presence marker + authoritative client verification)
Session storage: Shared KruMath localStorage (`sb-<projectRef>-auth-token`).
  KruMath does NOT write Supabase session cookies on krumath.com — see
  "Session model" below. This is a deviation from spec section 10.
Supabase project: Existing KruMath Supabase project
Required environment variables:
  VITE_SUPABASE_URL            (build time, = NEXT_PUBLIC_SUPABASE_URL)
  VITE_SUPABASE_ANON_KEY       (build time, = NEXT_PUBLIC_SUPABASE_ANON_KEY)
  VITE_KRUMATH_ORIGIN          (optional, local/dev only)
Required database tables/policies:
  public.khmer_typing_progress  (+ RLS: owner-only, anonymous sessions rejected)
  supabase/migrations/0001_khmer_typing_progress.sql
  Function: public.khmer_typing_is_member()
Any required KruMath main-app changes:
  1. Allow /khmer-typing-master (with optional ?search) in the /sign-in returnUrl validation
  2. Add a /home card linking to /khmer-typing-master (after the Worker route is live)
  3. Apply the migration above to the shared Supabase project
Cloudflare route: krumath.com/khmer-typing-master*  →  khmer-typing-master
Verification status: Cloudflare route, live sign-in redirect, asset delivery, database
  migration and RLS verified in production. The signed-in round trip needs an operator
  pass with a real KruMath session (see matrix below)
Known limitations:
  - Cloud sync is best-effort and debounced; localStorage remains the source of truth
  - DEV skips the auth gate so localhost works without a KruMath session
  - The SSR gate can only assert session *presence* (KruMath's `km_session` marker
    cookie). The real session lives in localStorage, which SSR cannot read, so the
    authoritative check runs client-side. A forged marker reaches an empty shell only;
    RLS still guards all data.
  - A session held only in `learn.krumath.com` cookies is not picked up here (different
    origin). This app reads the `krumath.com` localStorage session.
```

## Session model

Spec section 10 assumed a shared `.krumath.com` **cookie** carrying the Supabase
session. That is not how the main KruMath web app works:

- `KruMath/apps/web/src/config/supabase-browser.ts` persists the session in
  `localStorage` (`"Session persistence: localStorage (atomic, sync) — NOT
  @supabase/ssr cookies."`), so no `sb-*-auth-token` cookie exists on `krumath.com`.
- `createBrowserClient` (cookie-backed) is used only in `apps/learn`.
- The only `krumath.com` cookie is `km_session=1`, a presence marker with no session
  data, set by `KruMath/apps/web/src/contexts/AuthContext.tsx`. KruMath's own
  middleware gates `/dashboard` and `/settings` on exactly that marker.

This app therefore mirrors KruMath's contract:

1. **SSR gate** (`getAuthState` → `hasKrumathSessionMarker()`) checks the `km_session`
   cookie so unauthenticated requests redirect before any HTML renders.
2. **Authoritative check** (`useAuth` → `supabase.auth.getUser()`) runs in the browser.
   Because `localStorage` is scoped per origin and this app is served from
   `krumath.com/khmer-typing-master` — the same origin as `krumath.com/home` — the
   default `sb-<projectRef>-auth-token` key is the same session the main app wrote.
3. **Data access** is still protected by RLS keyed to `auth.uid()`.

Signing out calls the shared `supabase.auth.signOut()` (clearing the session the main
app reads) and also clears the `km_session` marker so KruMath's middleware sees the
logout (spec section 11).

## What this repo implements

| Spec area | Implementation |
|---|---|
| Base path (§17) | `vite.config.ts` `base` + Nitro `baseURL` = `/khmer-typing-master/` |
| Shared Supabase (§5) | `src/lib/supabase.client.ts` — localStorage session, default storage key |
| Session contract (§10) | `src/lib/krumathCookies.ts` (marker name + domain) and `src/lib/krumathSession.server.ts` (SSR presence check) |
| Hard gate (§8) | `beforeLoad` in `src/routes/index.tsx` + `getAuthState` in `src/lib/auth.functions.ts`, plus the authoritative client guard in `useAuth`/`index.tsx` |
| Anonymous rejection (§7) | `isPlayableUser` / `shouldBlock` in `src/lib/authUser.ts` |
| `returnUrl` (§9) | `signInUrl` in `src/lib/krumathUrls.ts` (exact param, encoded same-origin path, transient `_rsc` stripped) |
| Logout sync (§11) | `useAuth().signOut()` → shared `supabase.auth.signOut()` + marker clear |
| Home button (§12) | `krumathHomeUrl()` in the sidebar footer |
| Account/profile (§12) | `src/components/AccountMenu.tsx` (Sign In / email + Log out) |
| Optional nav (§13) | GitHub repo + `/pricing` links in the sidebar |
| Database + RLS (§15) | `supabase/migrations/0001_khmer_typing_progress.sql`, `src/lib/progress.ts` |

## Verification matrix (§23)

Status uses: `[x]` verified · `[~]` implemented, needs a signed-in operator pass · `[ ]` operator/maintainer action.

### Access
- [~] Logged-in user can open the project
- [x] Logged-out user is handled correctly (307 → `/sign-in?returnUrl=…`)
- [x] Anonymous user is handled correctly (rejected by RLS guard, verified in SQL)
- [ ] Expired session is handled correctly

### Sign-In
- [x] Project redirects to `/sign-in`
- [x] `returnUrl` parameter is exactly correct (`src/lib/__tests__/auth-gate.test.ts`)
- [x] Valid `returnUrl` is preserved, including `?search` deep links
- [ ] Login returns to the exact requested project route
- [x] Invalid/external `returnUrl` is not produced (`//host` and `://` rejected by test)
- [x] Transient `_rsc` prefetch params are stripped from `returnUrl`

### Session
- [~] Refresh preserves login
- [~] Session refresh works
- [~] Shared Supabase session works
- [~] No stale authenticated state remains (logout redirects to sign-in)

### Logout
- [~] Project logout signs out of shared KruMath account
- [~] KruMath logout invalidates project access
- [~] Reopening protected project after logout requires sign-in

### Navigation
- [x] Home button → `krumath.com/home` (`krumathHomeUrl()`)
- [x] Profile button is visible and usable (`src/components/__tests__/AccountMenu.test.tsx`)
- [x] Signed-in profile menu provides logout
- [x] Signed-out profile control provides sign-in
- [x] Optional Pricing/GitHub links are present (`src/components/NavigationSidebar.tsx`)

### Deployment
- [x] Independent GitHub repository
- [x] Independent Cloudflare Worker (`wrangler.toml`, `npm run deploy`)
- [x] Correct Cloudflare route (`krumath.com/khmer-typing-master*`, verified live)
- [x] Correct project base path
- [x] Assets load (build output under `.output/public/khmer-typing-master/assets/...`, `200` in production)
- [x] Production bundle targets the shared Supabase project (`diobjtrtyeggymdneyxv`)
- [~] Internal routes work
- [~] Direct URLs work
- [~] Refresh works
- [x] Main KruMath site still works (`krumath.com/home` → `200`)

### Security
- [x] No `service_role` key in client
- [x] No committed secrets (`.env.example` only)
- [x] `returnUrl` is validated on the KruMath side and produced safely here
- [x] Anonymous users cannot bypass protected access (`shouldBlock` + RLS guard)
- [x] RLS protects private data (owner-only policies)
- [x] Cross-user data access is prevented (`auth.uid() = user_id`)

### Responsive UI
- [~] Desktop
- [~] Tablet
- [~] Mobile
- [~] Home button remains usable
- [~] Account/profile button remains usable
- [~] Authentication states are clear

## Local verification performed

```text
npm test        → 58 tests passing (8 files)
npm run build   → client + SSR build succeed; supabase.client excluded from server graph
npx tsc --noEmit → only pre-existing import.meta.env index-signature (TS4111) errors
```

`npm run lint` reports repo-wide `prettier/prettier` CRLF line-ending errors caused by
`core.autocrlf=true` in this Windows checkout (for example on untouched `vitest.config.ts`),
so it is not a usable signal here. The changed files introduce no non-formatting lint issues.

`@supabase/ssr` is no longer a dependency: nothing reads Supabase session cookies now.

## Operator checklist

1. Apply `supabase/migrations/0001_khmer_typing_progress.sql` to the shared KruMath Supabase project.
2. Build and deploy with `VITE_SUPABASE_*` present at build time (`npm run deploy`).

   ⚠️ **Check the shell environment first.** Vite gives process env precedence over `.env`,
   so a leftover `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (for example the placeholder
   values in `.github/workflows/ci.yml`) silently ships broken credentials. Confirm the
   built bundle contains the real project:

   ```sh
   rg -o "https://[a-z0-9]+\.supabase\.co" .output/public | sort -u
   ```

3. Add the Cloudflare route `krumath.com/khmer-typing-master*` → Worker `khmer-typing-master`,
   more specific than the main `krumath` Worker.
4. Walk the verification matrix above on production with a real signed-in KruMath session.

## Maintainer checklist (KruMath repo, separate PR)

1. Confirm the `/sign-in` `returnUrl` validator accepts `/khmer-typing-master` and
   `/khmer-typing-master?level=...&lesson=...` while still rejecting external URLs.
2. Add the `/home` card linking to `/khmer-typing-master` after the route is verified.
3. Do not absorb this project's source into the KruMath monorepo.
