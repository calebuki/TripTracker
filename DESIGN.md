# Crumbs design system

Crumbs is drawn like a transit diagram. A trip is a line, every moment is a station, and the line's colour is the local time of day: deep blue at night, orange at sunrise, yellow through the day, red at sunset, purple at dusk. Ink does the talking. Colour is kept for routes, so a coloured mark always means "part of a trip, at this time of day".

## Rules

- **Decoration comes from data.** Route diagrams are built from real moment coordinates (`src/lib/route-diagram.ts`). Apart from the landscape backdrop below, don't add illustrations, stamps, or icon tiles that carry no information.
- **One backdrop.** The landscape illustration (`public/art/landscape.webp`, the `landscape-backdrop` utility) runs along the bottom of the dashboard, landing and sign-in pages. Those pages take its warm paper (`#f7eee5`) and keep room at the bottom so content never sits on the hills. The trip map and settings screens don't use it.
- **No kicker labels** above headings, and no tagline triads. Headings say what the section is ("Current trip", "Past trips").
- **Copy is plain.** Controls name their action ("Follow trip", "Stop following"). Errors name the problem and the fix.
- **No cards inside cards.** Lists are rows separated by 2px hairlines. Only one thing on a screen gets a card (e.g. the current trip).
- **No glass, decorative gradients, or hard offset shadows.** The time-of-day trail is the one gradient, because every colour in it is a real time.

## Tokens (`src/app/globals.css`)

| Token | Use |
|---|---|
| `--paper` / `--paper-strong` | Page ground / sunk fills (secondary buttons, tracks, skeletons) |
| `--surface` | Cards, inputs, floating surfaces |
| `--ink` / `--ink-soft` | Text and primary buttons / secondary text (≥ 4.5:1 on paper) |
| `--line` | 2px hairlines and resting input borders |
| `--accent` | Theme accent (avatar, selection) |
| `--ring` | Focus outline (3px, 3px offset) |
| `--route-*` | Accent colours. Trip markers in lists use `getRouteColorForKey(trip.id)`; tomato marks the crumb code and the wordmark |

Trail colours are not tokens: they come from the time-of-day scale in `src/lib/time-of-day.ts` (`getTimeOfDayColor`), so the map, the stops, the diagrams and the legend always agree.

The per-trip themes (Classic, Blush, Midnight) live in `src/lib/trip-theme.ts` and override the same variables.

## Type

One family: **Barlow** (a highway-signage grotesk), loaded in `layout.tsx`.

- Display: `font-display` utility (800 weight, -0.02em). Hero at `clamp(3.25rem, 8.5vw, 6rem)`; page titles 3–4.5rem; section headings `text-2xl`.
- Body: 16–18px, weight 500. Labels and meta: 14–15px, weight 600–700. Nothing functional below 12px.
- Numbers that change (counts, days) use `.tabular`.

## Shape

- Buttons are pills, echoing a line's round caps. Surfaces use a 16px radius (`rounded-2xl`), inputs 12px (`rounded-xl`), and menu items 8px so they nest inside a 16px menu with 6px padding.
- In-page surfaces have a 2px `--line` border. Floating surfaces (menus, popovers, dialogs) have a 2px `--ink` border and one tight shadow.

## Map

- The trail is one line with a `line-gradient`: between two moments it passes through the colour of every hour in between, so an overnight gap fades through dusk, night and dawn. It sits on an ink casing so yellow daytime stretches stay visible on the light basemap. Diagrams do the same with one SVG gradient per stretch.
- Stations: photos sit inside a ring of their time's colour; notes are a white circle with a coloured rim; both have a thin ink edge. The stop number is a small ink badge; the selected stop gets an ink ring. Stations use literal ink and white because they sit on the basemap in every theme.
- Days are numbered from the trip's start date (`getTripDayIndex`) for labels like "Day 2"; the first stop of a new day gets an ink ring.
- `TimeOfDayLegend` explains the scale wherever a trail appears without context (landing page, trip sidebar).
- Anything floating over the map (title card, day dock, buttons, the moment sheet) is a solid surface with a 2px ink edge. No glass or blur.

## Motion

- Easing: `--ease-out` for anything responding to the user, `--ease-in-out` for things moving along a path.
- Press: `scale(0.97)` over 160ms. No lift-on-hover.
- Signature moments: route lines draw in stop by stop when they scroll into view, easing into each station, stations pop as the line reaches them, and a train runs along the active route. The crumb code's five stations fill as you type, shake on a wrong code, and send a train down the line on success.
- Everything respects `prefers-reduced-motion`. The JS-driven pieces (the train, the shake) check it explicitly.

## Local previews

Demo mode skips the logged-out screens. In development, `/?preview=welcome` shows the landing page and `/auth?preview=form` shows the sign-in form.
