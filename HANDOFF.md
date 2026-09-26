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
Authentication model: Hard gate
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
Verification status: Code + tests + build verified locally; Cloudflare route and live
  sign-in/sign-out loop pending operator verification (see matrix below)
Known limitations:
  - Cloud sync is best-effort and debounced; localStorage remains the source of truth
  - DEV skips the auth gate (no shared .krumath.com cookies on localhost)
  - No server-side data endpoints; Supabase access is via shared cookies + RLS
```

## What this repo implements

| Spec area | Implementation |
|---|---|
| Base path (§17) | `vite.config.ts` `base` + Nitro `baseURL` = `/khmer-typing-master/` |
| Shared Supabase (§5) | `src/lib/supabase.client.ts`, `src/lib/supabase.server.ts` |
| Cookie sharing (§10) | `src/lib/krumathCookies.ts` — `.krumath.com`, `path=/`, `lax`, `secure` |
| Hard gate (§8) | `beforeLoad` in `src/routes/index.tsx` + `getAuthState` in `src/lib/auth.functions.ts` |
| Anonymous rejection (§7) | `isPlayableUser` / `shouldBlock` in `src/lib/authUser.ts` |
| `returnUrl` (§9) | `signInUrl` in `src/lib/krumathUrls.ts` (exact param, encoded same-origin path) |
| Logout sync (§11) | `useAuth().signOut()` → shared `supabase.auth.signOut()` |
| Home button (§12) | `krumathHomeUrl()` in the top bar and sidebar |
| Account/profile (§12) | `src/components/AccountMenu.tsx` (Sign In / email + Log out) |
| Optional nav (§13) | GitHub repo + `/pricing` links in the sidebar |
| Database + RLS (§15) | `supabase/migrations/0001_khmer_typing_progress.sql`, `src/lib/progress.ts` |

## Verification matrix (§23)

Status uses: `[x]` verified locally (tests/build) · `[~]` implemented, needs live verification · `[ ]` operator/maintainer action.

### Access
- [~] Logged-in user can open the project
- [~] Logged-out user is handled correctly (redirect to sign-in)
- [~] Anonymous user is handled correctly (rejected)
- [ ] Expired session is handled correctly

### Sign-In
- [~] Project redirects to `/sign-in`
- [x] `returnUrl` parameter is exactly correct (`src/lib/__tests__/auth-gate.test.ts`)
- [x] Valid `returnUrl` is preserved, including `?search` deep links
- [~] Login returns to the exact requested project route
- [x] Invalid/external `returnUrl` is not produced (`//host` and `://` rejected by test)

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
- [~] Independent Cloudflare Worker (`wrangler.toml`, `npm run deploy`)
- [ ] Correct Cloudflare route
- [x] Correct project base path
- [x] Assets load (build output under `.output/public/khmer-typing-master/assets/...`)
- [~] Internal routes work
- [~] Direct URLs work
- [~] Refresh works
- [ ] Main KruMath site still works

### Security
- [x] No `service_role` key in client
- [x] No committed secrets (`.env.example` only)
- [x] `returnUrl` is validated on the KruMath side and produced safely here
- [x] Anonymous users cannot bypass protected access (`shouldBlock` + server check)
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
npm test        → 51 tests passing (7 files)
npm run build   → client + SSR build succeed; supabase.client excluded from server graph
npx tsc --noEmit → no new type errors (pre-existing import.meta.env index-signature errors remain)
```

`npm run lint` reports repo-wide `prettier/prettier` CRLF line-ending errors on files that were
not touched by this change (for example `vite.config.ts`), so it is not a usable signal in this
Windows checkout. No non-formatting lint issues were introduced.

## Operator checklist

1. Apply `supabase/migrations/0001_khmer_typing_progress.sql` to the shared KruMath Supabase project.
2. Build and deploy with `VITE_SUPABASE_*` present at build time (`npm run deploy`).
3. Add the Cloudflare route `krumath.com/khmer-typing-master*` → Worker `khmer-typing-master`,
   more specific than the main `krumath` Worker.
4. Walk the verification matrix above on production.

## Maintainer checklist (KruMath repo, separate PR)

1. Confirm the `/sign-in` `returnUrl` validator accepts `/khmer-typing-master` and
   `/khmer-typing-master?level=...&lesson=...` while still rejecting external URLs.
2. Add the `/home` card linking to `/khmer-typing-master` after the route is verified.
3. Do not absorb this project's source into the KruMath monorepo.
