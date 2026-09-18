# Critique 02: the running app

This review covers the live app at `http://localhost:5231` (Vite dev), with the clock pinned
through `?at=HH:MM` and state seeded into `localStorage["hourly.v2"]`. I drove it with
Playwright (Chromium, 1× unless noted) and saved every capture to `docs/critique/shots/`:

- Hours at 1440×900: `app-0710/1014/1207/1430/1640/1830-1440.png` (light) and
  `app-1942/2315/0300-1440.png` (dark).
- Sizes: `app-1207-390/360*.png`, `app-1942-390/360*.png`, `app-1014-1920.png`,
  `app-1942-1920.png`, `app-1640-1024.png`.
- Panels: `panel-collection-*`, `panel-settings-*`, `dialog-*`, `empty-*`, `fresh-1014`.
- Dials and skies: `dial-<id>-1014/1942`, `sky-<id>-1207/2110`, collected in `sheet-dials.png`
  and `sheet-skies.png`.
- Interactions: `hover-*`, `check-mid/late/after-1430`, `float-*` (2× frames of the "+1"),
  `cleanday-*`, `add-*`, `unlock-after-1430`, `equip-rays-1430`, `focus-*` (`sheet-focus.png`),
  `focus-check-3x.png`, `rail-2x-1942.png`, `reduced-*`.
- Hour handoff: `handoff-<dial>-0000/0300/0600/1500` at 10:59→11:00, collected in
  `sheet-handoff.png`.

The console showed **0 errors and 0 warnings** across roughly 60 page loads. Unlocking Rays
moved the balance from 17 to 9 in both the panel sentence and the rail ring. A clean day added
+2 as specified. Keyboard access works: Enter on a rail icon moves focus into the panel, Escape
closes it and returns focus to the icon, and the dialog focuses Cancel while Escape cancels.
Reduced motion stops the aurora, forces the second hand to tick, and opens the panel at once.

## Verdict

This is no longer a generic build. The port matches the revised mockups almost pixel for pixel.
In light mode the lit wedge now reads at every hour (3.7–4.1:1 against the page), the donut
chart is gone, the log is flat and quiet, and the Collection and Settings panels carry their
own vocabulary: live dial preview, gradient sky strips, and a lit underline instead of pill
toggles. There is one blocker, and it takes one line to fix: **on every phone the page pans
sideways** (the halo makes `scrollWidth` 429 at 390 and 392 at 360). The rest is colour
discipline, and it is where the day stops reading as one system. From noon to about 17:00 in
light, the base paper drifts to cream and green-grey, and the lit colour sinks to olive and
mustard. At night the indigo wedge nearly disappears into its own ring (1.6:1). The minute hand
lands on the numerals. Fix those four things and the app is ready to ship.

## Status of the 01 findings in the live app

| # | 01 finding | Status | Evidence |
| - | ---------- | ------ | -------- |
| 1 | Light lit section not lit | **Fixed** | Wedge vs page just outside: 7h 4.08, 10h 3.74, 12h 3.98, 14h 4.00, 16h 4.05, 18h 4.06. Halo is a whiter spot. The hue quality at 12–15h has regressed (new M2). |
| 2 | Ring reads as a donut chart | **Fixed** | Squint test passes in both themes. Only the Lantern dial brings a split back (new m6). |
| 3 | Text contrast fails | **Fixed** | Pewter, hour-ink, numerals, and check glyph all clear AA/3:1 on sampled backgrounds (DESIGN.md §1 table matches my samples within ±0.2). |
| 4 | Dead lower third / orphaned at 1920 | **Partly fixed** | 1440×900 is centred and balanced. At 1920 a 345px hole remains between the clock and the log (m1). |
| 5 | AI sparkle icon | **Fixed** | Dial-with-lit-arc icon, hour-tinted (`rail-2x-1942.png`). |
| 6 | Identical dial tiles | **Fixed** | Tiles removed, 168px live preview added. Orbit and Lantern thumbnails are too faint in light (m6). |
| 7 | Legend-style sky strips | **Fixed** | Smooth 200×6 gradients with an hour tick. The tick touches the description line (n3). |
| 8 | Invisible grain | **Fixed** | Grain visible on the face at both themes. |
| 9 | Seven-day pie charts | **Fixed** | Discs filled by opacity. |
| 10 | Log collapses at 1024/360 | **Fixed** | Meta moves under the title at ≤1180, and the box aligns to the first line. A cascade bug undoes the reserved space for "Remove" (n2). |
| 11 | DESIGN.md vs mockup disagree | **Fixed** | Spot-checked 14 values against `tokens.css`. All match. |
| 12 | Settings, dialog, states unmocked | **Fixed** | `settings.html` and `light-14.html` exist, and the port matches them. |
| 13 | Group heading too close to panel title | **Fixed** | Group 19px with a hairline above. |

## Answers to the coordinator's four questions

**1. Is noon drifting into warm cream? Yes, from 12:00 to about 17:00.** Measured OKLCH of
the page at 1440×900:

| Sample | 10:14 | 12:07 | 14:30 | 16:40 |
| --- | --- | --- | --- | --- |
| Top-left (60–120, 70–130) | `#D5E4F2` h246 | `#EDE8D7` **h93** C.023 | `#EBEAE3` h100 | `#ECE3D8` **h73** C.018 |
| Clock face | `#E0EBF6` h248 | `#F1EEE3` **h94** | `#EFEFEB` h107 | `#E6E0DA` h68 |
| Top-right (1000–1300, 90–140) | `#DEE8F3` h251 | `#EBEAE4` h99 | `#EAECEB` **h165** | `#EBE8E5` h68 |
| Bottom-right (1100–1300, 820–880) | `#D4E0EC` h248 | `#DFE1E0` **h165** | `#DEE0DF` **h165** | `#DFDBDE` h334 |
| Below hour word | `#E2E8F1` h258 | `#E2E8F1` h258 | `#E2E8F1` h258 | `#E2E8F1` h258 |

The cream tell (#F4F1EA) sits at h87 with C .010. At noon the clock face and the top-left
corner sit at h93–94 with C .015–.023, which is the same hue at higher chroma. That is the tell,
not an echo of it. Worse, where a straw `--hour-next` aurora meets the blue base, oklab mixing
produces a **green-grey (h165)** in the bottom-right and top-right corners. The lower-left of
the page stays blue (h258), so from 12 to 16 the paper splits into two unrelated tints. My
recommendation is to keep the paper cool, let only the light source warm, and confine the light
to the hero. Exact fix in M1.

**2. Does the day read as one coherent system?** Mostly, yes. The invariants hold at every
hour: layout, type, ink, hairlines, and the hour entering through the same seven channels
(wedge, bloom, halo, second hand, checks, discs, rail dot and lumen ring). Dark hours read as
one app. Light 07:10, 10:14, and 18:30 read as the same app. The break is **12:00–15:59 in
light**. There the paper goes cream or green-grey (M1) and the accent goes olive and mustard
(M2, `#996C00` at noon, `#867331` at 14:30), and the page looks like a different, earthier
product. The system also weakens at 23:00–03:59 in dark, where the lit wedge nearly vanishes
(M3). These are three localized value problems. The system itself is sound.

**3. Should the handoff of the other dials be fixed?** Yes, but it is low priority and should
come after M1–M4 (see m5). The top of the hour is the one moment the concept performs, and
Sector already shows how it should feel. Rays and Hairline drop the old mark in one frame, and
Orbit's lit dot jumps from r9 to r5 in place (`sheet-handoff.png`, rows 2–4). Few people see it
live, which is why it is not a blocker.

**4. What did the port lose, and what reads as generic?** The engineer's port lost almost
nothing. Differences from the mockups are limited to m4 (the unlayered focus rule, which the
mockup's hand-drawn ring hid), n1, and n2. Nothing reads as AI-made at the level of structure
or copy. The remaining "generic" risks are colour ones: the cream noon (M1) and olive fills
(M2). There is also a smaller idiom risk: the rail's lumen count in a ring reads as an
unread-notification badge (n6).

## Findings, by severity

### B1. Every phone pans sideways (blocker, engineer, one line)

**Where:** `src/styles/surfaces.css` `.halo` (`inset: -30%`) and `.grain` (`inset: -22%`)
inside `.clock-wrap`, at ≤760px. Probe: 390×844 → `scrollWidth` 429 (culprits `halo` right
edge 429, `grain` 403); 360×740 → 392. `window.scrollTo(60,0)` lands at `scrollX` 39. See
`app-1207-390-hscroll.png`, where the wordmark and "Today's log" are cut off at the left.

**Why it matters:** A horizontal swipe on the log shifts the entire page 32–39px and exposes
the edge. This fails the brief's quality floor ("responsive to 360px"), and on a phone it feels
broken, not premium.

**Fix:** `#root { overflow-x: clip; }` in `app.css`. `clip` does not create a scroll
container, and fixed-position children (aurora, rail, panel) are unaffected. Do not clip
`.shell` or `.hero`: on desktop that would cut the halo with a hard vertical edge at x≈88.
Acceptance: `scrollWidth === clientWidth` at 360, 390, 760, and 1024.

### M1. Light-mode paper drifts to cream and green-grey at 12–17h (major, design)

**Where:** `surfaces.css` `.page-bg` (wash) and `.aurora-a/-b/-c`, and `tokens.css` light
`--hour-wash` 8% and `--aurora-alpha` .22. Measurements in Answer 1. Screenshots:
`app-1207-1440.png`, `app-1430-1440.png`, `app-1640-1440.png`, `sky-ember-1207.png`.

**Why it reads as generic:** Warm cream plus a serif display is item 1 on the calibration
list, and the brief pins a blue-grey base. The green-grey corners read as dirty, not lit.
Premium ambient light (Arc, Linear) is local and on a constant paper. It does not re-dye the
paper.

**Fix:** The paper stays cool at every hour, and the hour lives only in the light source around
the clock.

- Light only: aurora B and C stop taking the hour. Set `.aurora-b` to
  `color-mix(in oklab, #9FB6D8 calc(var(--aurora-alpha)*80%), transparent)` and `.aurora-c` to
  `color-mix(in oklab, #B7C8E2 calc(var(--aurora-alpha)*50%), transparent)`. These are
  fixed cool blue-grey light. Dark keeps all three hour-tinted, which works.
- Light `--hour-wash` 8% → 5%, with the wash ending at 40% instead of 60%
  (`linear-gradient(170deg, var(--hour-wash), transparent 40%)`).
- Light aurora A keeps the hour but at `--aurora-alpha` .22 → .16.
- The halo keeps its current recipe. It is allowed to warm, because it is the light source.
- Acceptance at 12:07, 14:30, and 16:40 (1440×900): samples at (1000–1300, 90–140),
  (1100–1300, 820–880), and (900–1150, 680–720) stay in OKLCH h 235–275 with C ≥ .010. Only the
  region within about 1.3× the clock radius may leave that band.

### M2. Afternoon yellows render as olive and mustard, and pale Tide stops as sage (major, design + engineer)

**Where:** `tokens.css` `--hour-fill: oklch(from … min(l, .56) c h)`. Measured lit wedge: noon
`#996C00` (h80, C.117), 14:30 **`#867331` (h93, C.089)**, 16:40 `#A36300`. Tide at noon renders
a grey-green wedge (`sky-tide-1207.png`). The same fill drives checks, discs, the second hand,
and the lumen ring, so at 14:30 the whole log is khaki (`check-after-1430.png`). With Rays
equipped at 14:30, the lit ray is hard to tell from the grey rays (`equip-rays-1430.png`).

**Why it reads weak:** Clamping lightness alone preserves the hue. At L .56, hues 85–110° are
olive by definition, and low-chroma stops (straw `#DBC784`, sea glass `#BFE3D6`) go drab. "The
clock strikes gold" is drawn in bronze-khaki.

**Fix:**
- CSS: add a chroma floor to the light fill:
  `oklch(from var(--hour-lit, var(--hour)) min(l, .56) max(c, .12) h)`. That fixes Tide and
  every pale stop.
- JS (in `litHue` or `useHourHue`, light theme only): if the stop's OKLCH hue is between 82°
  and 115°, set `--hour-lit` to the same stop with hue 80° and chroma ≥ .125. The results are
  12h ≈`#9A6A00`, 13–14h ≈`#9C6900`, 15h ≈`#A16600`. All sit at 4.0:1 against the page, and
  the paper check glyph on them is 4.3:1.
- Design: confirm that 13–14h may share a fill. Only one wedge is lit at a time, and the
  handoff still reads through the wedge position. If not, author a hand-tuned 24-stop light-fill
  column for Daylight 12–15 in DESIGN.md §2.

### M3. At night the lit wedge disappears into its ring (major, design)

**Where:** dark `--hour-fill: var(--hour-lit, var(--hour))`. Measured wedge vs neighbouring
section: 03:00 `#47459C` **1.67:1**, 23:15 `#5652A9` **1.80:1**, while 19:42 is 2.45 inside the
halo. See `app-0300-1440.png` and `app-2315-1440.png`. Night checkboxes and discs are equally
dim.

**Why it matters:** For about five hours a night, the one memorable thing is a dim violet chip.
The light-theme clamp solved this for pale stops; dark needs the mirror image.

**Fix:** In `[data-theme="dark"]` and the auto-dark block, set
`--hour-fill: oklch(from var(--hour-lit, var(--hour)) max(l, .62) c h)`. Indigo 2–3h becomes
≈`#777AD7`: 3.6:1 against the ring, 4.1:1 against the page, and the navy check glyph on it is
4.9:1. Stops already above L .62 (coral, gold) are unchanged. Keep `--hour-glow` and the aurora
on the raw `--hour` so the night stays deep.

### M4. The minute hand's tip lands inside the numerals (major, design)

**Where:** DESIGN.md §6 and `dialGeometry.ts` `HANDS.minute` length 132, with numerals at r 126
(glyph about ±8). Visible in most captures: the tip sits on "2" at 07:10, "6" at 14:30 and
18:30, "8" at 16:40 and in the 1024 capture, "3" at 23:15, and "12" at 03:00.

**Why it reads weak:** A tip that stubs into a glyph looks like a drawing error, and the
numeral turns into a smudge ("-8"). It is on the hero, which is the one element that has to
look precise.

**Fix:** Minute hand length 132 → **146**, tail 18. The tip then reaches the minute track
(ticks r 147–151), which is watch convention: the hand crosses a numeral cleanly instead of
ending inside it. Keep width 4. Keep the hour hand at 92. For Rays (numerals at r 104), the
same 146 applies.

### m1. At 1920 there is a 345px hole between the clock and the log (moderate, design)

**Where:** `app.css` `@media (min-width:1600px)` `.columns { gap: 96px }` with a 55/45 split.
In `app-1014-1920.png` the clock ends at x 695 and the log starts at 1040.

**Fix:** At ≥1600, use `.columns { grid-template-columns: 1fr 1fr; gap: 128px; }` and
`.hero { justify-self: end; }`, with the words still left-aligned to the clock. The
composition then gathers around the centre gutter, and the outer margins take the extra space.

### m2. The clean-day toast shifts the log by 26px, twice (moderate, engineer)

**Where:** `QuestLog.tsx` renders `<p class="toast">` between the head and the rows. The first
row moves from y 219.0 to 245.2, then back to 219.0 after 3.2s (`cleanday-log-1430.png`).

**Why it matters:** The app's one celebration moment makes the list jump under the cursor.

**Fix:** Render the toast in the log head in place of the count ("A clean day. +2 lumens." in
`--hour-ink`, right-aligned). After 3.2s it crossfades (200ms) to "Cleared.". No new line box.

### m3. The "+1" lumen is a 250ms blink at the box's corner (moderate, design keyframes + engineer position)

**Where:** `surfaces.css` `.lumen-rise` (900ms, `--ease-settle`) and `app.css` `.lumen-float
{ left: 2px; top: 0 }`. Measured opacity: 0 at 60ms, .99 at 120ms, .43 at 200ms, .06 at
320ms, gone by 500ms. The ease-settle curve front-loads the keyframes, so a 900ms animation is
visible for about 250ms. It renders 11px wide at the top-left corner of the box and reads like
a footnote (`float-1942-120.png`).

**Fix:**
- Keyframes: `0% {opacity:0; transform:translateY(4px)} 12% {opacity:1;
  transform:translateY(0)} 65% {opacity:1; transform:translateY(-8px)} 100% {opacity:0;
  transform:translateY(-14px)}`, with `animation-timing-function: linear` on the element.
- Position: `left: 13px; top: -8px; translate: -50% 0;`, 13/600 tabular, `--hour-ink`, so it
  is centred over the box.

### m4. Focus squares off the checkbox and rail buttons (moderate, design: `surfaces.css`)

**Where:** `:where(button, a, input, select, [tabindex]):focus-visible { … border-radius:
inherit; }`. The rule is unlayered, so it beats Tailwind's layered `rounded-check` and
`rounded-control`. Measured: `.check` 6px → **0px** on focus, and `.rail-btn` 10px → **0px**.
See `focus-check-3x.png`: a square box inside a square ring.

**Why it matters:** The control changes shape when it receives focus, and the ring loses the
radius system. On the keyboard path this is the most visible port defect.

**Fix:** Delete `border-radius: inherit` from the focus rule. Outlines follow the element's own
radius in current Chromium, Firefox, and Safari.

### m5. Dial handoff at the top of the hour (low-moderate, engineer)

**Where:** `Clock.tsx`. Only `SectorFace` renders per-section lit overlays that crossfade
(`.clock-lit`, 1200ms). Hairline and Rays re-key the lit mark (`key={lit-${lit}}` with
`light-on`), so the old mark is cut and the new one fades in. Orbit swaps `r` and fill on the
same `<circle>`, so it jumps.

**Fix:** Generalize Sector's approach. Every dial renders all 12 lit marks with `opacity:
isLit ? 1 : 0` and the same `.clock-lit` transition. For Orbit, draw the lit dot as a separate
r 9 circle per section, with `transform: scale(isLit ? 1 : .55)` plus opacity on the same
1200ms `--ease-dawn`. Under reduced motion it remains a cut (already handled in `app.css`).

### m6. Orbit's structure is invisible, and Lantern splits in half (moderate, design)

**Where:** `sheet-dials.png`, columns 3–4. Orbit's unlit dots at `--ring-tint` (12% / 11%)
and its 1px `line` ring nearly vanish in both themes, so the dial reads as a blank face with
one dot. Lantern in dark shows the PM lap as a mauve left half against an olive-brown right
half: a two-slice pie. In light, the Lantern and Orbit thumbnails in the Collection read as
empty placeholder discs.

**Fix:**
- Orbit: unlit dots fill `color-mix(in oklab, var(--slate) 40%, transparent)` (dark 32%),
  r 5 → 5.5, and ring `line` → `line-strong`.
- Lantern: desaturate the wedges harder, `color-mix(in oklab, <stop> 25%, var(--slate))` at
  `--lantern-tint` (7% / 9%), so it reads as one soft disc with the lit wedge as the only
  colour.

### Minor

- **n1. Log rules overhang by 6px (engineer).** `.row { margin: 0 -6px 0 -2px }` makes the
  rules run from x 771 to 1254, while the header rule, well, and week row run from 773 to
  1248. Keep the bleed for the hover fill only: draw the rule as `.row::before { left: 2px;
  right: 6px; border-top: 1px solid var(--line) }`.
- **n2. The ≤1180 `.row { padding-right: 64px }` never applies (engineer).** It is declared
  before the base `.row { padding: 12px 6px 12px 2px }` in `app.css` §3, which overrides it
  (computed `padding-right` 6px at 1024). On hover, "Remove" can overlap the first line of a
  long title. Move the media block after §3 or raise it to `.rows .row`.
- **n3. The sky tick touches the description line (engineer).** `.tick { top: 10px }` with a
  4px height ends where the description line box begins, so it reads as a stray mark in "the
  way". Use `top: -6px` (above the strip) or `mb-3` on `.strip-wrap`.
- **n4. Settings choices are 15 separate tab stops (engineer).** `role="radiogroup"` implies
  one tab stop per group, with a roving `tabindex` and arrow keys.
- **n5. The stepper ignores 12h mode (design).** With Clock labels set to 12h, it shows
  "19:00" while the header shows "7:42 pm". Follow `use24h` ("7 pm" / "6 am").
- **n6. The lumen ring reads as an unread-count badge (design).** A number in a coloured
  circle at the foot of a nav rail is the notification idiom. Consider the count in tabular
  13/500 `slate` with the 4px `--hour-fill` dot above it (the rail's own "lit" mark), and keep
  the tooltip.

## Working, and to be protected

- **The light-mode instrument.** Whiter halo, deepened fill, desaturated 12% ring tints, and
  the 1.5° gap. The wedge reads at 3.7–4.1:1 at every light hour I sampled, and the squint test
  passes. Keep the `@property --hour` registration: it makes the whole page recolour in
  1200ms without restarting animations.
- **The lit underline.** The segmented control with no track, pill, or thumb is the most
  distinctive piece of UI chrome in the app and belongs to the lighting vocabulary. Do not
  swap it for a component-library segmented control.
- **The Collection.** No tiles, a live 168px preview of the equipped dial, smooth sky
  gradients with a current-hour tick, the balance as one sentence, and "Buy" appearing only
  when affordable. Unlock and equip update the rail, the sentence, and the clock in the same
  frame.
- **Flat log and copy.** Hairline rows, a curly apostrophe in "Today's log", "Cleared.",
  "Nothing on the log yet.", and "A clean day. +2 lumens.". No exclamation marks, no emoji, no
  arrows.
- **Motion and accessibility.** One load moment, full reduced-motion coverage (aurora frozen,
  tick, 1ms entrances, instant panel), focus moved into and out of the panel correctly,
  Escape handled at both the panel and dialog layers, and a polite live region for the time.
  Zero console errors.
