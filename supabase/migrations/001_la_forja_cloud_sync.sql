create table if not exists public.user_state_domains (
  user_id uuid not null references auth.users(id) on delete cascade,
  domain text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, domain),
  constraint user_state_domains_domain_check check (
    domain in (
      'profile',
      'player',
      'operation',
      'generated-levels',
      'free-workouts',
      'exercise-intelligence'
    )
  )
);

create or replace function public.set_la_forja_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_state_domains_updated_at on public.user_state_domains;
create trigger set_user_state_domains_updated_at
before update on public.user_state_domains
for each row execute function public.set_la_forja_updated_at();

alter table public.user_state_domains enable row level security;

drop policy if exists "Users can read own La Forja state" on public.user_state_domains;
create policy "Users can read own La Forja state"
on public.user_state_domains
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own La Forja state" on public.user_state_domains;
create policy "Users can insert own La Forja state"
on public.user_state_domains
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own La Forja state" on public.user_state_domains;
create policy "Users can update own La Forja state"
on public.user_state_domains
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own La Forja state" on public.user_state_domains;
create policy "Users can delete own La Forja state"
on public.user_state_domains
for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists user_state_domains_updated_at_idx
on public.user_state_domains (user_id, updated_at desc);
