# Hourly

A personal web app. A live analog clock is the hero and the current hour's section is lit;
every hour of the day has its own hue, and the page's light follows it. Underneath, a daily
quest log: checking off a quest earns a lumen, clearing every quest in a day earns two more,
and lumens buy alternate clock faces (dials) and hue ramps (skies) in the Collection.

Vite + React 19 + TypeScript + Tailwind v4. No backend, no login: everything lives in this
browser's `localStorage` under the key `hourly.v2` (a versioned JSON document; "Clear all
data" in Settings removes it).

## Scripts

| Script              | What it does                                  |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Vite dev server                               |
| `npm run build`     | `tsc -b && vite build` → `dist/`              |
| `npm run preview`   | Serve the production build                    |
| `npm run typecheck` | TypeScript project build, no emit             |
| `npm run lint`      | oxlint                                        |
| `npm test`          | vitest (jsdom + testing-library), single run  |

## Pinning the clock for screenshots

In dev builds only, add `?at=HH:MM` to the URL to pin the app to that local time today:

```
http://localhost:5173/?at=19:42
```

Seconds still advance from :00, so the hands move. The hour word, theme (in auto mode),
hue, and the quest day all follow the pinned time. Ignored in production builds.

## Where things live

- `src/lib` — pure logic: time, quests and the lumen ledger, skies, dials, storage.
- `src/state` — the reducer store, persistence, `useNow`, theme resolution, the hook that
  mirrors the hour onto `<html>` (`--hour`, `--hour-next`, `--hour-lit`, `data-theme`).
- `src/components` — the UI; `clock/` holds the SVG clock, its geometry, and dial thumbnails.
- `src/styles` — `tokens.css` and `surfaces.css` are the design system (design-owned);
  `app.css` holds engineering-side additions.
- `DESIGN.md` — the design system rationale and values. `docs/` — brief, mockups, screenshots.
