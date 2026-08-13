create table if not exists public.trip_anonymous_views (
  trip_id uuid not null references public.trips(id) on delete cascade,
  visitor_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (trip_id, visitor_id)
);

alter table public.trip_anonymous_views enable row level security;

revoke all on table public.trip_anonymous_views from anon, authenticated;
grant select, insert, delete on table public.trip_anonymous_views to service_role;

comment on table public.trip_anonymous_views is 'One row per anonymous browser per trip. Access is restricted to trusted server-side code.';
comment on column public.trip_anonymous_views.visitor_id is 'Random persistent browser UUID generated client-side; not a fingerprint or user identifier.';
