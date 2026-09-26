# Khmer Type Master — deploy & mount on krumath.com

App-specific values for the shared playbook in [`KRUMATH_GAME_INTEGRATION.md`](KRUMATH_GAME_INTEGRATION.md).
Handoff summary for the KruMath maintainer: [`HANDOFF.md`](HANDOFF.md).

## This app

| Item | Value |
|------|--------|
| Repo | `khmer-type-master` (separate GitHub repo) |
| Public path | `/khmer-typing-master` |
| Vite `base` / Nitro `baseURL` | `/khmer-typing-master/` |
| Cloudflare Worker name | `khmer-typing-master` |
| Auth gate | **Hard** — the whole app requires a valid, non-anonymous KruMath session |
| Session storage | Shared KruMath **localStorage** (`sb-<projectRef>-auth-token`); KruMath writes no session cookie on `krumath.com` |
| Signed-out behavior | SSR redirect to `/sign-in?returnUrl=/khmer-typing-master[?search]` |
| Progress | `localStorage` + merged into `public.khmer_typing_progress` (RLS) when signed in |
| DB migration | `supabase/migrations/0001_khmer_typing_progress.sql` |

Auth implementation:

- `src/lib/auth.functions.ts` — server-side session **presence** check via `getAuthState`.
- `src/lib/krumathSession.server.ts` — reads KruMath's `km_session` marker cookie during SSR.
- `src/routes/index.tsx` — `beforeLoad` hard gate + authoritative client-side guard;
  deep-link search is preserved in `returnUrl` (transient `_rsc` is stripped).
- `src/lib/useAuth.ts` — resolves the real session from localStorage and exposes `checking`.
- `src/components/AccountMenu.tsx` — Sign In (signed out) / profile + Log out (signed in).
- `src/lib/krumathUrls.ts` — `/home`, `/pricing`, and exact `returnUrl` sign-in URLs.

KruMath keeps the Supabase session in `localStorage`, so SSR can only assert that a
session marker exists; the real check runs in the browser. DEV skips the gate so
`npm run dev` works without a KruMath session.

## Deploy (operator)

```sh
cp .env.example .env   # fill VITE_SUPABASE_* from KruMath
npm install
npm run deploy         # build + nitro deploy --prebuilt
```

⚠️ **Vite gives process env precedence over `.env`.** If `VITE_SUPABASE_URL` or
`VITE_SUPABASE_ANON_KEY` are set in your shell (for example the placeholder values used
by `.github/workflows/ci.yml`), the build silently ships those instead of `.env`. Verify
before deploying:

```sh
rg -o "https://[a-z0-9]+\.supabase\.co" .output/public | sort -u
```

Apply the database migration to the shared KruMath Supabase project once (SQL editor or
`supabase db push`), before or alongside the first deploy:

```text
supabase/migrations/0001_khmer_typing_progress.sql
```

Cloudflare hostname route (more specific than the main `krumath` Worker):

```text
krumath.com/khmer-typing-master*  →  khmer-typing-master
```

Smoke-test:

- [ ] `https://krumath.com/khmer-typing-master` loads for a signed-in user
- [ ] Signed-out visit redirects to `/sign-in?returnUrl=/khmer-typing-master`
- [ ] After sign-in the user returns to the project (and to the same lesson on deep links)
- [ ] Anonymous Supabase sessions are rejected
- [ ] Assets load from `/khmer-typing-master/assets/...` (not `/assets/...` on the main site)
- [ ] Refresh keeps the session
- [ ] Home button opens `https://krumath.com/home`
- [ ] Account menu shows the email; Log out also signs the user out of KruMath
- [ ] Reopening the project after logout requires sign-in
- [ ] Progress made while signed in appears on another device
- [ ] The rest of `krumath.com` still works

## Phase C — KruMath maintainer only (not this repo)

Do **not** implement these from the feature-repo agent:

1. Ensure `/khmer-typing-master` is allowed by the `/sign-in` `returnUrl` validation (same-origin path, with optional `?search`).
2. Add a `/home` game card linking to `/khmer-typing-master`.
3. Apply `0001_khmer_typing_progress.sql` to the shared Supabase project.
4. Only after the Worker route works.

## Local URL

```text
http://localhost:5173/khmer-typing-master/
```
