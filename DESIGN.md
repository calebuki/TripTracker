# Crumbs design system

Crumbs is drawn like a transit diagram. A trip is a line, each day rides its own colour, and every moment is a station. Ink does the talking. Colour is kept for routes, so a coloured mark always means "part of a trip".

## Rules

- **Decoration comes from data.** Route diagrams are built from real moment coordinates (`src/lib/route-diagram.ts`). Don't add illustrations, stamps, or icon tiles that carry no information.
- **No kicker labels** above headings, and no tagline triads. Headings say what the section is ("Current trip", "Past trips").
- **Copy is plain.** Controls name their action ("Follow trip", "Stop following"). Errors name the problem and the fix.
- **No cards inside cards.** Lists are rows separated by 2px hairlines. Only one thing on a screen gets a card (e.g. the current trip).
- **No glass, gradients, or hard offset shadows.**

## Tokens (`src/app/globals.css`)

| Token | Use |
|---|---|
| `--paper` / `--paper-strong` | Page ground / sunk fills (secondary buttons, tracks, skeletons) |
| `--surface` | Cards, inputs, floating surfaces |
| `--ink` / `--ink-soft` | Text and primary buttons / secondary text (≥ 4.5:1 on paper) |
| `--line` | 2px hairlines and resting input borders |
| `--accent` | Theme accent (avatar, selection) |
| `--ring` | Focus outline (3px, 3px offset) |
| `--route-*` | Route colours. Days use `getRouteColor(index)`; lists use `getRouteColorForKey(trip.id)` |

The per-trip themes (Classic, Blush, Midnight) live in `src/lib/trip-theme.ts` and override the same variables.

## Type

One family: **Barlow** (a highway-signage grotesk), loaded in `layout.tsx`.

- Display: `font-display` utility (800 weight, -0.02em). Hero at `clamp(3.25rem, 8.5vw, 6rem)`; page titles 3–4.5rem; section headings `text-2xl`.
- Body: 16–18px, weight 500. Labels and meta: 14–15px, weight 600–700. Nothing functional below 12px.
- Numbers that change (counts, days) use `.tabular`.

## Shape

- Buttons are pills, echoing a line's round caps. Surfaces use a 16px radius (`rounded-2xl`), inputs 12px (`rounded-xl`), and menu items 8px so they nest inside a 16px menu with 6px padding.
- In-page surfaces have a 2px `--line` border. Floating surfaces (menus, popovers, dialogs) have a 2px `--ink` border and one tight shadow.

## Motion

- Easing: `--ease-out` for anything responding to the user, `--ease-in-out` for things moving along a path.
- Press: `scale(0.97)` over 160ms. No lift-on-hover.
- Signature moments: route lines draw in day by day when they scroll into view, stations pop as the line reaches them, and a train runs along the active route. The crumb code's five stations fill as you type, shake on a wrong code, and send a train down the line on success.
- Everything respects `prefers-reduced-motion`. The JS-driven pieces (the train, the shake) check it explicitly.

## Local previews

Demo mode skips the logged-out screens. In development, `/?preview=welcome` shows the landing page and `/auth?preview=form` shows the sign-in form.
