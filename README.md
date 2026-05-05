# TripTrace

TripTrace is a private, map-first travel journal built with Next.js, TypeScript, Tailwind CSS, shadcn-style UI primitives, MapLibre, EXIF photo parsing, and Supabase-ready data/storage plumbing.

The app is designed around one core experience: open a private link, see where the traveler went, and tap into the moments that happened there.

## What ships in this MVP

- Landing page, auth page, trip creation, traveler dashboard, shared viewer route, and trip settings
- Full-screen interactive map with daily route lines, photo markers, thought markers, and a mobile-style bottom sheet
- EXIF GPS and capture-time parsing with `exifr`
- Fallback flows for photos without GPS: current location, manual map pin, or save without location
- Thought composer with current-location default and map pin fallback
- Private share links, optional lightweight viewer passcode, and location privacy modes
- Hide/delete moment controls plus a hidden-moments settings page
- Demo fallback with a seeded Paris Maymester trip when Supabase is not configured

## Stack

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Radix primitives with shadcn-style components
- MapLibre via `react-map-gl`
- Supabase Auth, Postgres, and Storage
- Luxon for timezone-aware formatting

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment file:

```bash
cp .env.example .env.local
```

3. Start the dev server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

If you leave Supabase env vars blank, TripTrace runs in demo mode with a seeded Paris trip at `/t/paris-maymester-private`.

## Environment variables

`NEXT_PUBLIC_SUPABASE_URL`
Public Supabase project URL.

`NEXT_PUBLIC_SUPABASE_ANON_KEY`
Public Supabase browser key.

`NEXT_PUBLIC_TRIPTRACE_STORAGE_BUCKET`
Storage bucket for uploaded photo moments. Defaults to `trip-moments`.

`NEXT_PUBLIC_MAP_STYLE_URL`
MapLibre style URL. Defaults to `https://demotiles.maplibre.org/style.json`.

`NEXT_PUBLIC_TRIPTRACE_SITE_URL`
Canonical app URL for generating auth redirects and shared links in local or deployed environments.

## Supabase setup

1. Create a Supabase project.
2. Open the SQL editor and run [supabase/schema.sql](/C:/Users/caleb/Code/TripTracker/supabase/schema.sql).
3. Optionally run [supabase/seed.sql](/C:/Users/caleb/Code/TripTracker/supabase/seed.sql) to load sample Paris data into Supabase too.
4. In Authentication, enable email magic links.
5. In Authentication URL settings, add your local site URL such as `http://localhost:3000`.
6. Create the `.env.local` values from your Supabase project settings.

## Storage notes

- The schema creates a public `trip-moments` bucket so shared viewers can render photo URLs directly.
- Uploaded files are stored under `ownerId/tripId/file.ext`.
- Storage RLS allows owners to write to their own folder prefix.

## Demo mode

Without Supabase, TripTrace stores new demo trips and moments in browser `localStorage`.

- The Paris demo trip is always available.
- New demo uploads are compressed to data URLs for local preview and persistence.
- Shared links in demo mode work in the same browser profile because the data lives locally.

## Useful scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
```

## Project structure

```text
src/app                  Routes
src/components           Map, dialogs, shared UI, screens
src/hooks                Auth and trip data hooks
src/lib                  Env, EXIF, map, time, repositories
src/types                Domain and Supabase types
supabase/schema.sql      Database schema, RLS, storage policies
supabase/seed.sql        Optional sample seed for Supabase
public/demo              Local demo art used by the seed trip
```

## Current privacy model

- Share links use long unguessable slugs.
- Optional viewer passcodes are hashed before storage.
- Location privacy supports exact, approximate, and hide-current-day display modes.

The viewer passcode is intentionally lightweight in this MVP. It adds friction for casual access, but it is not intended to be a high-security gate.
