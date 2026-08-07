alter table public.trips
  add column if not exists theme text not null default 'classic';

alter table public.trips
  drop constraint if exists trips_theme_check;

alter table public.trips
  add constraint trips_theme_check
  check (theme in ('classic', 'blush', 'midnight'));
