create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text,
  created_at timestamptz not null default now()
);

create or replace function public.sync_auth_user_to_public_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, display_name, created_at)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name'
    ),
    coalesce(new.created_at, now())
  )
  on conflict (id) do update
  set email = excluded.email,
      display_name = coalesce(excluded.display_name, public.users.display_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.sync_auth_user_to_public_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update of email, raw_user_meta_data on auth.users
for each row
execute function public.sync_auth_user_to_public_user();

revoke execute on function public.sync_auth_user_to_public_user() from public, anon, authenticated;

insert into public.users (id, email, display_name, created_at)
select
  id,
  coalesce(email, ''),
  coalesce(
    raw_user_meta_data ->> 'display_name',
    raw_user_meta_data ->> 'full_name'
  ),
  created_at
from auth.users
on conflict (id) do update
set email = excluded.email,
    display_name = coalesce(excluded.display_name, public.users.display_name);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  description text,
  start_date date not null,
  end_date date,
  timezone text not null default 'Europe/Paris',
  share_slug text not null unique,
  share_code text not null unique,
  viewer_passcode_hash text,
  privacy_mode text not null default 'private_link' check (privacy_mode in ('private_link', 'invite_only')),
  location_privacy_mode text not null default 'exact' check (location_privacy_mode in ('exact', 'delayed')),
  publish_delay_hours integer not null default 6 check (publish_delay_hours >= 1 and publish_delay_hours <= 168),
  cover_location_name text,
  cover_latitude double precision,
  cover_longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.trips
  alter column end_date drop not null;

alter table if exists public.trips
  add column if not exists publish_delay_hours integer not null default 6;

update public.trips
set location_privacy_mode = 'delayed'
where location_privacy_mode in ('approximate', 'hide_current_day');

alter table if exists public.trips
  drop constraint if exists trips_location_privacy_mode_check;

alter table if exists public.trips
  add constraint trips_location_privacy_mode_check
  check (location_privacy_mode in ('exact', 'delayed'));

alter table if exists public.trips
  drop constraint if exists trips_publish_delay_hours_check;

alter table if exists public.trips
  add constraint trips_publish_delay_hours_check
  check (publish_delay_hours >= 1 and publish_delay_hours <= 168);

create table if not exists public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid references public.users (id) on delete cascade,
  role text not null check (role in ('owner', 'viewer')),
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.moments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  author_id uuid not null references public.users (id) on delete cascade,
  type text not null check (type in ('photo', 'thought')),
  caption text,
  thought_text text,
  image_url text,
  image_storage_path text,
  latitude double precision,
  longitude double precision,
  place_name text,
  location_source text not null check (location_source in ('exif', 'browser_gps', 'manual', 'none')),
  accuracy_meters double precision,
  taken_at timestamptz,
  posted_at timestamptz not null default now(),
  timezone text not null default 'Europe/Paris',
  visibility text not null default 'visible' check (visibility in ('visible', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trip_watches (
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_viewed_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

create table if not exists public.trip_commenters (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  token_hash text not null,
  display_number integer not null check (display_number > 0),
  created_at timestamptz not null default now(),
  unique (trip_id, token_hash),
  unique (trip_id, display_number)
);

create table if not exists public.moment_comments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  moment_id uuid not null references public.moments (id) on delete cascade,
  commenter_id uuid references public.trip_commenters (id) on delete set null,
  author_id uuid references public.users (id) on delete set null,
  body text not null check (
    length(trim(body)) > 0
    and length(trim(body)) <= 1000
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (commenter_id is not null and author_id is null)
    or (commenter_id is null and author_id is not null)
  )
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_parent_trip_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.trips
  set updated_at = now()
  where id = coalesce(new.trip_id, old.trip_id);

  return coalesce(new, old);
end;
$$;

drop trigger if exists touch_trips_updated_at on public.trips;
create trigger touch_trips_updated_at
before update on public.trips
for each row
execute function public.touch_updated_at();

drop trigger if exists touch_moments_updated_at on public.moments;
create trigger touch_moments_updated_at
before update on public.moments
for each row
execute function public.touch_updated_at();

drop trigger if exists touch_moment_comments_updated_at on public.moment_comments;
create trigger touch_moment_comments_updated_at
before update on public.moment_comments
for each row
execute function public.touch_updated_at();

drop trigger if exists touch_parent_trip_from_moments on public.moments;
create trigger touch_parent_trip_from_moments
after insert or update or delete on public.moments
for each row
execute function public.touch_parent_trip_updated_at();

create index if not exists trips_owner_id_idx on public.trips (owner_id);
create unique index if not exists trips_one_active_trip_per_owner_idx
  on public.trips (owner_id)
  where end_date is null;
create index if not exists trips_share_slug_idx on public.trips (share_slug);
create index if not exists trips_share_code_idx on public.trips (share_code);
create index if not exists moments_trip_id_idx on public.moments (trip_id);
create index if not exists moments_trip_id_taken_at_idx on public.moments (trip_id, taken_at, posted_at);
create index if not exists trip_commenters_trip_id_idx on public.trip_commenters (trip_id);
create index if not exists trip_watches_user_id_last_viewed_at_idx
  on public.trip_watches (user_id, last_viewed_at desc);
create index if not exists moment_comments_moment_id_created_at_idx
  on public.moment_comments (moment_id, created_at);
create index if not exists moment_comments_trip_id_idx on public.moment_comments (trip_id);

alter table public.users enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.trip_watches enable row level security;
alter table public.moments enable row level security;
alter table public.trip_commenters enable row level security;
alter table public.moment_comments enable row level security;

drop policy if exists "Users can read themselves" on public.users;
create policy "Users can read themselves"
on public.users
for select
using (auth.uid() = id);

drop policy if exists "Users can upsert themselves" on public.users;
create policy "Users can upsert themselves"
on public.users
for insert
with check (auth.uid() = id);

drop policy if exists "Users can update themselves" on public.users;
create policy "Users can update themselves"
on public.users
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Owners can manage their trips" on public.trips;
create policy "Owners can manage their trips"
on public.trips
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Shared trips can be viewed" on public.trips;
create policy "Shared trips can be viewed"
on public.trips
for select
using (privacy_mode = 'private_link');

drop policy if exists "Owners can manage trip members" on public.trip_members;
create policy "Owners can manage trip members"
on public.trip_members
for all
using (
  exists (
    select 1
    from public.trips
    where trips.id = trip_members.trip_id
      and trips.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.trips
    where trips.id = trip_members.trip_id
      and trips.owner_id = auth.uid()
  )
);

drop policy if exists "Users can manage their own trip watches" on public.trip_watches;
create policy "Users can manage their own trip watches"
on public.trip_watches
for all
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Owners can manage moments" on public.moments;
create policy "Owners can manage moments"
on public.moments
for all
using (
  exists (
    select 1
    from public.trips
    where trips.id = moments.trip_id
      and trips.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.trips
    where trips.id = moments.trip_id
      and trips.owner_id = auth.uid()
  )
);

drop policy if exists "Visible shared moments can be viewed" on public.moments;
create policy "Visible shared moments can be viewed"
on public.moments
for select
using (
  visibility = 'visible'
  and exists (
    select 1
    from public.trips
    where trips.id = moments.trip_id
      and trips.privacy_mode = 'private_link'
  )
);

insert into storage.buckets (id, name, public)
values ('trip-moments', 'trip-moments', true)
on conflict (id) do nothing;

drop policy if exists "Trip moments are publicly viewable" on storage.objects;
create policy "Trip moments are publicly viewable"
on storage.objects
for select
using (bucket_id = 'trip-moments');

drop policy if exists "Owners can upload trip moments" on storage.objects;
create policy "Owners can upload trip moments"
on storage.objects
for insert
with check (
  bucket_id = 'trip-moments'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Owners can update trip moments" on storage.objects;
create policy "Owners can update trip moments"
on storage.objects
for update
using (
  bucket_id = 'trip-moments'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'trip-moments'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Owners can delete trip moments" on storage.objects;
create policy "Owners can delete trip moments"
on storage.objects
for delete
using (
  bucket_id = 'trip-moments'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);
