create table if not exists public.trip_user_views (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

alter table public.trip_user_views enable row level security;

revoke all on table public.trip_user_views from anon, authenticated;
grant select, insert, delete on table public.trip_user_views to service_role;

create index if not exists trip_user_views_user_id_idx
  on public.trip_user_views (user_id);

comment on table public.trip_user_views is 'One row per authenticated user per trip for all-time unique trip reach. Access is restricted to trusted server-side code.';
