-- Khmer Type Master — per-user lesson progress.
--
-- Runs against the EXISTING shared KruMath Supabase project (spec section 15).
-- Do not create a separate Supabase project for this app.
--
-- Security model:
--   * one row per user, keyed by auth.users.id
--   * RLS restricts every operation to the row owner (auth.uid() = user_id)
--   * anonymous (guest) Supabase sessions are rejected, matching the app's hard
--     gate and the KruMath "playable user" rule (is_anonymous !== true)

create table if not exists public.khmer_typing_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  progress jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.khmer_typing_progress enable row level security;

-- True only for a real, non-anonymous KruMath account session.
-- search_path is pinned empty to satisfy the `function_search_path_mutable`
-- advisor; the body only calls schema-qualified auth.* helpers so it is safe.
create or replace function public.khmer_typing_is_member()
returns boolean
language sql
stable
set search_path = ''
as $$
  select
    auth.uid() is not null
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false;
$$;

drop policy if exists "khmer_typing_progress_select_own" on public.khmer_typing_progress;
create policy "khmer_typing_progress_select_own"
  on public.khmer_typing_progress
  for select
  to authenticated
  using (public.khmer_typing_is_member() and auth.uid() = user_id);

drop policy if exists "khmer_typing_progress_insert_own" on public.khmer_typing_progress;
create policy "khmer_typing_progress_insert_own"
  on public.khmer_typing_progress
  for insert
  to authenticated
  with check (public.khmer_typing_is_member() and auth.uid() = user_id);

drop policy if exists "khmer_typing_progress_update_own" on public.khmer_typing_progress;
create policy "khmer_typing_progress_update_own"
  on public.khmer_typing_progress
  for update
  to authenticated
  using (public.khmer_typing_is_member() and auth.uid() = user_id)
  with check (public.khmer_typing_is_member() and auth.uid() = user_id);

drop policy if exists "khmer_typing_progress_delete_own" on public.khmer_typing_progress;
create policy "khmer_typing_progress_delete_own"
  on public.khmer_typing_progress
  for delete
  to authenticated
  using (public.khmer_typing_is_member() and auth.uid() = user_id);
