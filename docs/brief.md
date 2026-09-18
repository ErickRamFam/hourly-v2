# Hourly v2 — shared brief

Personal web app. A live analog clock is the hero; the current hour's section is lit.
Light theme by day, dark by night (auto, with override). A daily quest log framed like a
lightweight objective log. Checking off a quest earns a token. No pet / companion.
Navigation is an icon rail on the RIGHT that expands into a panel.

This replaces an earlier build (../hourly) that came out generic (cream neo-brutalist,
Fredoka, rounded cards). Design quality is the priority. Stack is fixed: Vite + React +
TypeScript + Tailwind v4 (CSS-first `@theme`), localStorage, no backend, no login.

## Client's design direction (verbatim intent)

Soft blue-and-grey palette, light gradient background, subtle grain on the hero surface,
a soft radial glow behind the clock instead of a hard box, quiet understated copy
("Every hour gets its own color"). Push it further and make it premium: gradients used
with intention (ambient glows, depth, subtle mesh/aurora blends behind key surfaces),
Linear / Vercel / Arc / Raycast restraint. Light glassmorphism on key panels only. Real
type hierarchy with a deliberate pairing (not Inter/Roboto/Arial), consistent spacing
scale, micro-interactions that feel alive without gimmicks.

Hard bans (the client called these out explicitly):
- identical rounded cards with the same soft shadow repeated everywhere
- ALL-CAPS eyebrow labels
- meta text joined with middle dots ("A · B · C")
- bolding / coloring a single word in a sentence for emphasis
- boxed "big number + small label" stat cards as a default
- monospace for small data labels, "→" appended to links, tinted-black #111 backgrounds
- the clock as "one card among cards" — it is the hero, everything else is quieter

## Lead's decisions (already made — build on these, don't reopen)

**Concept: the page is lit by the hour.** Every hour of the 24 has its own hue. The lit
section of the clock carries the current hour's hue, and the ambient aurora behind the
clock and across the page background is tinted by it. The whole page slowly changes color
through the day. This is the one memorable thing; everything else is quiet.

*Revised after critique 02:* in the light theme the page wash and all three aurora blobs
stay a fixed blue-grey, and the hour lives only in the halo, the glow, and the lit marks.
Hour-tinted light auroras pushed the page toward warm cream and green-grey from noon to
five, off the blue-grey brief. The dark theme keeps the hour-tinted aurora.

**Palette family.** Cool blue-grey. Light: mist/paper backgrounds (around #EEF2F8 → #DEE4EE),
blue-black ink (around #1B2331, never a tinted black), slate secondary text. Dark: deep
navy (around #0E1320 → #151C2C), pale ink (#E8EDF5). Shadows tinted with the ink color,
layered, never flat grey rgba(0,0,0,.1). Design director owns the exact values.

**Type pairing: Instrument Serif + Instrument Sans.** Serif (regular + italic) is the
voice: the hour word ("Late morning"), the one line of personality copy, section titles.
Sans is the instrument: UI, quests, numerals (tabular). Same foundry, drawn to pair.
Design director may argue for a different sans if Instrument Sans's numerals disappoint,
but must keep a two-voice pairing that is not Inter/Roboto/Arial/Geist.

**Hour hue ramp: 24 stops.** A day read clockwise: indigo night, violet before dawn, rose
and peach at sunrise, morning blues, gold at noon, straw afternoon, amber golden hour,
coral sunset, mauve dusk, back to indigo. The 12 ring sections show faint tints of the
current lap's 12 hours (AM lap or PM lap), so the ring itself reads differently morning
vs evening. Only the current section is fully lit.

**Theme auto mode.** Light between "day begins" (default 6:00) and "night begins"
(default 19:00), dark otherwise. Both boundaries are adjustable in settings. Override:
auto / light / dark.

**Tokens are "lumens".** Light is the app's material, so the currency is light. One lumen
per quest completed; +2 for clearing every quest in a day ("a clean day"). Lumens are
spent in the Collection on two kinds of things:
- **Dials** — alternate clock faces. Sector (default: filled arcs), Hairline (thin ring,
  ticks only, lit section is a bright arc), Rays (twelve radial lines, lit one glows),
  Lantern (soft full-wedge fill, no outline), Orbit (twelve dots, lit one swells).
- **Skies** — alternate hue ramps that recolor the hour hues + glow: Daylight (default),
  Ember (warm), Tide (teal/sea-glass), Graphite (all grey; the lit hour is the only color).
Prices roughly 6–12 lumens. Owned items can be equipped anytime. Balance and lifetime
earned are shown in the Collection, quietly, not as a stat card.

**Quests.** Title + optional "repeats daily". Per-day list; repeating quests come back
unchecked each day, one-offs are gone after their day. Day rolls over at 4:00 local.
A quiet seven-day row under the log shows the last week (small rings, filled by how much
of that day was cleared). Empty state invites: "Nothing on the log yet."

**Rail (right side).** Three destinations: Today, Collection, Settings. Icon rail
(~64px) expands to a ~380px panel that slides in from the right. Panels use the one
glass treatment in the app. Settings contains: theme override; day/night boundaries;
second hand (sweep / tick / hidden); 12h/24h labels; reduce motion; clear all data (with
confirm). Collection contains lumen balance, Dials, Skies.

**Copy voice.** Sentence case, plain verbs, dry and warm. "Every hour gets its own color."
"Add a quest." "Cleared." No exclamation marks, no emoji.

**Layout (desktop).** Two columns inside the rail: clock hero left (~55%), quest log right.
Clock ≥ 380px. On narrow screens: clock stacks above quests; rail becomes a compact
right-edge column, panel becomes a full-height sheet.

## File ownership
- Design director: DESIGN.md, src/styles/**, docs/mockup/**, docs/screenshots/**
- Engineer: everything else (config, src/lib, src/state, src/components, tests)
- Critic: docs/critique/** only (reports), never edits source

## Quality floor
Responsive to 360px, visible keyboard focus, prefers-reduced-motion respected, WCAG AA
contrast for text, works offline, no console errors, `npm run typecheck && npm run lint &&
npm test && npm run build` all pass.
