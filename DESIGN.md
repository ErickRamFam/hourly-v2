# Hourly — design system

The page is lit by the hour. One bold thing: the clock and its light. Everything else is
quiet, flat, and hairlined. No cards. Shadows only under the panel and the confirm dialog.

**This file is the single source.** Values here match `src/styles/tokens.css` (tokens),
`src/styles/surfaces.css` (recipes), and the reference rendering in `docs/mockup/`
(`mockup.css` + the generated HTML). Where the three ever disagree, this file wins; tell the
design director.

Revision 3 applies the design-owned findings of `docs/critique/01-mockup.md` and
`docs/critique/02-app.md` (M1–M4, m1, m3, m4, m6, n5, n6). Numbers under "measured" come from
pixel samples of the running app (`?at=HH:MM`, 1440×900), not from flat hexes.

## 1. Palette

### Light

| Token         | Value                     | Role |
| ------------- | ------------------------- | ---- |
| `paper`       | `#F1F4F9`                 | Page base, top of the gradient; dialog fill |
| `mist`        | `#DDE4EE`                 | Page base, bottom of the gradient |
| `ink`         | `#1B2331`                 | Text, hands, hour ticks, filled button. Blue-black, never a tinted black |
| `slate`       | `#56637A`                 | Secondary text: date, count, personality line, descriptions |
| `pewter`      | `#4F5C74`                 | Tertiary: "repeats daily", weekday letters, prices, placeholders, text buttons |
| `surface`     | `#F7F9FC`                 | Add-quest well |
| `line`        | `rgb(27 35 49 / .10)`     | Hairlines |
| `line-strong` | `rgb(27 35 49 / .18)`     | Control borders, unchecked box, first log rule, seven-day ring |
| `glass`       | `rgb(247 249 252 / .62)`  | Panel fill under backdrop blur |
| `dialog-backdrop` | `rgb(27 35 49 / .32)` | Behind the confirm dialog |

### Dark

| Token         | Value                     | Role |
| ------------- | ------------------------- | ---- |
| `paper`       | `#0E1320`                 | Page base, top |
| `mist`        | `#161D2E`                 | Page base, bottom |
| `ink`         | `#E8EDF5`                 | Text, hands, filled button |
| `slate`       | `#A3AEC2`                 | Secondary text |
| `pewter`      | `#929EB3`                 | Tertiary text |
| `surface`     | `#1A2234`                 | Add-quest well |
| `line`        | `rgb(232 237 245 / .09)`  | Hairlines |
| `line-strong` | `rgb(232 237 245 / .16)`  | Control borders |
| `glass`       | `rgb(22 29 46 / .60)`     | Panel fill |
| `dialog-backdrop` | `rgb(5 8 16 / .55)`   | Behind the confirm dialog |

### Contrast, measured on the washed page (WCAG 2.x, AA = 4.5 text, 3.0 graphics)

| Text / mark | Theme | Worst background sampled | Ratio |
| --- | --- | --- | --- |
| pewter "repeats daily", weekday letters | light | `#E4EBF3` / `#E5EAF2` | 5.61 / 5.58 |
| pewter at noon | light | `#E7EBEF` | 5.63 |
| slate personality line (10h / 12h) | light | `#E3E9F1` / `#E4E9F2` | 4.97 / 4.98 |
| clock numerals, ink at .8 (10h / 12h / 16h) | light | `#DCEAF6` / `#F1EEE3` / `#F1E7DB` | 7.22 / 7.49 / 7.25 |
| `--hour-ink` links (10h / 12h / 14h, on mist) | light | `#DDE4EE` | 6.3 / 5.2 / 5.0 |
| lit wedge vs page just outside it (07:10 / 12:07 / 14:30 / 16:40), app | light | halo | 3.53 / 3.79 / 4.03 / 3.88 |
| lit wedge vs weaker ring neighbour (same hours), app | light | ring | 3.43 / 3.24 / 3.66 / 3.68 |
| check glyph, paper on `--hour-fill` (10 / 12 / 14 / 16h) | light | — | 3.82 / 4.12 / 3.96 / 4.33 |
| pewter meta, weekday letters | dark | `#1A1B29` / `#131928` | 6.30 / 6.48 |
| pewter / slate on glass (whole panel height) | dark | `#1C1F34` | 6.00 / 7.25 |
| slate personality line | dark | `#161C2B` | 7.60 |
| clock numerals, ink at .8, beside the lit hour | dark | `#794858` | 4.64 |

| lit wedge vs weaker ring neighbour (23:15 / 03:00 / 19:42 / 21:10), app | dark | ring | 3.70 / 4.66 / 3.03 / 3.49 |
| lit wedge vs page just outside it (same hours), app | dark | halo | 4.42 / 5.00 / 3.13 / 4.21 |
| navy check glyph on `--hour-fill` (same hours) | dark | — | 7.9 / 7.2 / 7.2 / 7.8 |

Page paper in light, OKLCH of patch means at 07:10, 12:07, 14:30 and 16:40 (top-right,
bottom-right, below the log, top-left corner): h 257–261 at every hour, C .010–.018. The
noon page reads blue-grey; the only warm light is the halo around the clock.

### Shadows (ink-tinted, layered; panel and dialog only)

Light panel: `0 0 0 1px rgb(27 35 49/.06), 0 1px 2px rgb(27 35 49/.05), 0 12px 32px -12px rgb(27 35 49/.18), 0 32px 64px -24px rgb(27 35 49/.16)`
Light dialog: `0 0 0 1px rgb(27 35 49/.07), 0 2px 4px rgb(27 35 49/.06), 0 24px 56px -16px rgb(27 35 49/.26)`
Dark panel: `0 0 0 1px rgb(232 237 245/.06), 0 1px 2px rgb(5 8 16/.4), 0 16px 40px -12px rgb(5 8 16/.55), 0 40px 80px -24px rgb(5 8 16/.5)`
Dark dialog: `0 0 0 1px rgb(232 237 245/.08), 0 2px 4px rgb(5 8 16/.4), 0 28px 64px -16px rgb(5 8 16/.65)`

### Hour-derived colors (runtime)

JS sets on `<html>`: `--hour` (current stop of the equipped sky), `--hour-next` (next
stop), and for the Graphite sky only `--hour-lit` (the Daylight stop). JS sets `--halo-x` /
`--halo-y` on the halo element (§5). Everything else derives in CSS.

| Var           | Light | Dark | Used for |
| ------------- | ----- | ---- | -------- |
| `--hour`      | ramp hex | same | aurora, source for all below |
| `--hour-fill` | lit-fill rule below; fallback without relative color: `color-mix(in oklab, hour 62%, ink)` (all 24 stops ≥ 3.1:1) | `oklch(from var(--hour-lit, var(--hour)) max(l, .74) c h)`; fallback `var(--hour-lit, var(--hour))` | **everything drawn as lit**: wedge, second hand, cap ring, checked box, seven-day discs, active rail dot, lumen ring, equipped dot, segmented underline |
| `--hour-glow` | `color-mix(in oklab, hour 26%, white)` | `hour 70%, white 6%` | halo |
| `--hour-bloom`| `color-mix(in oklab, hour 50%, white)` | `= --hour-glow` | the two blurred copies around the lit mark |
| `--hour-soft` | `hour 34%, transparent` | `hour 40%, transparent` | glow shadow on rail dot and underline, today ring |
| `--hour-tint` | `(hour 55% + slate) at 12%` | `… at 11%` | faint tint of one hour (ring uses the lap stops, §6) |
| `--hour-ink`  | `hour 40%, ink` | `hour 55%, ink` | text links ("Equip", "Buy"), focus ring |
| `--hour-wash` | `hour 5%, transparent` | `hour 12%, transparent` | row hover |
| `--page-wash` | `#9FB6D8 10%, transparent` (fixed) | `= --hour-wash` | page wash, ends at `--wash-stop` (light 40%, dark 60%) |
| `--aurora-a/b/c-tint` | `#9FB6D8` / `#9FB6D8` / `#A9BDDD` (fixed) | `--hour` / `--hour-next` / `--hour` | aurora blobs |
| `--orbit-dot` | `slate 40%, transparent` | `slate 32%, transparent` | Orbit's unlit dots |

In light, the paper is fixed cool blue-grey at every hour; the hour exists only in the
light source (halo, bloom) and the lit marks. The halo and bloom are whiter than the page,
and the fill is deeper than it. In dark, the aurora, halo and bloom carry the raw hour so
the night stays deep, and only the fill is lifted.

**Lit-fill rule (light), implemented in tokens.css, no JS:**
`oklch(from var(--hour-lit, var(--hour)) min(l, .56) max(c, .12) calc(h - clamp(0, h - 80, 35) + clamp(0, h - 115, 35)))`.
Lightness cap .56 (≥ 3:1 against the haloed page); chroma floor .12 (pale straw and sea glass
stay colour, never grey or sage); hue identity below 80° and above 150°, flat 80° across
80–115° (yellows become gold, never olive), and 115–150° re-spread to 80–150° so the map is
continuous. 12h and 13–14h may share nearly the same gold; one wedge is lit at a time and
the position carries the change. Measured: 12:07 `#A26B06`, 14:30 `#9A6C02`, 16:40 `#A46400`.
**Dark:** lightness floor .74 (night indigo 23h `#9FA0FD`, 3h `#9499F5`; coral 19h `#EB8192`).

### Light strengths (per theme)

| Var | Light | Dark |
| --- | --- | --- |
| `--aurora-alpha` | .16 | .34 |
| `--halo-alpha` | .70 | .62 |
| `--glow-near` (blur 6) | .90 | .75 |
| `--glow-far` (blur 16) | .60 | .45 |
| `--wedge-edge` (inner arc stroke) | .45 | 0 |
| `--edge-alpha` (outer white highlight) | .35 | .22 |
| `--grain-alpha` | .50 | .15 |
| `--ring-tint` | 12% | 11% |

## 2. Skies (hour hue ramps)

A day read clockwise. Adjacent stops differ in hue or lightness enough that the top of the
hour is visible. In light, every stop is drawn through `--hour-fill` (lightness clamped to
.56), so pale stops still read as lit.

### Daylight (default)

```
 0 #4C4FA6   6 #B97A9F  12 #E8B93F  18 #E2735F
 1 #444A9F   7 #DC8B86  13 #E6C35C  19 #D2687A
 2 #3E4497   8 #EBA77C  14 #DBC784  20 #AB6A94
 3 #47459C   9 #86B3D8  15 #E0B252  21 #8661A4
 4 #5A50A6  10 #5EA3DC  16 #E39F48  22 #6857A9
 5 #7A62B0  11 #7FB8D8  17 #E6864A  23 #5652A9
```
Indigo night (0–3), violet lift (4–5), rose and peach sunrise (6–8), morning blues (9–11),
gold noon (12, a deliberate cut), straw afternoon (13–15), amber golden hour (16–17), coral
sunset (18–19), mauve dusk (20–21), back to indigo (22–23).

### Ember (warm)

```
 0 #6E3A5C   6 #B85A5A  12 #F0CB7A  18 #DA6146
 1 #663554   7 #CF6E52  13 #ECBD6E  19 #CC5150
 2 #5E3150   8 #DE8551  14 #E8B168  20 #B4485B
 3 #6B3556   9 #E39A55  15 #E5A15C  21 #984262
 4 #83405E  10 #E6AC5C  16 #E38E4F  22 #833E63
 5 #9E4A5F  11 #E9BB67  17 #E07846  23 #763B60
```

### Tide (teal, sea glass)

```
 0 #2F5A78   6 #4A9DA5  12 #BFE3D6  18 #58A0A2
 1 #2B5473   7 #5DB2AE  13 #B4DED2  19 #4B8D9A
 2 #284F6E   8 #72C2B4  14 #A6D6CA  20 #407A90
 3 #2C5877   9 #86CDBD  15 #94CCC0  21 #386A87
 4 #327089  10 #98D5C6  16 #7FC0B4  22 #325F7E
 5 #3A8698  11 #ABDCCF  17 #6AB1AA  23 #305C7B
```

### Graphite (grey; the lit hour is the only color)

```
 0 #4A5060   6 #6E7484  12 #B6BCC6  18 #808796
 1 #4D5363   7 #79808F  13 #B0B6C1  19 #747B8B
 2 #505666   8 #858C9A  14 #A8AEBA  20 #686F80
 3 #545A6A   9 #9299A6  15 #9FA5B2  21 #5D6374
 4 #5B6171  10 #9EA5B1  16 #959CA9  22 #535969
 5 #646A7A  11 #AAB0BB  17 #8B92A0  23 #4E5464
```
With Graphite equipped, `--hour` / `--hour-next` get the Graphite stops (ring, aurora,
halo, links go grey) and `--hour-lit` gets the Daylight stop, so `--hour-fill` (and so
the wedge, second hand, and checks) is the one color on the page.

## 3. Type

Google Fonts:
`https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wdth,wght@0,75..100,400..700;1,75..100,400..700&family=Instrument+Serif:ital@0;1&display=swap`
or `@fontsource-variable/instrument-sans` + `@fontsource/instrument-serif`.

Serif is the voice (regular and italic only; never synthesize bold). Sans is the
instrument. Line length under 70 characters.

| Role              | Face | Size desktop / ≤760 | Wt | Line-height | Tracking | Token |
| ----------------- | ---- | ------------------- | -- | ----------- | -------- | ----- |
| Hour word         | Serif | 56 / 40 | 400 | 1.0  | -0.015em | `text-hourword` |
| Personality line  | Serif italic | 22 / 19 | 400 | 1.35 | 0 | `text-personality` (`text-wrap: balance`, max 36ch) |
| Section / panel title | Serif | 26 | 400 | 1.15 | -0.005em | `text-title` ("Today's log", "Collection", "Settings", dialog title) |
| Group title       | Serif | 19 | 400 | 1.2  | 0 | `text-group` ("Dials", "Skies") |
| Wordmark          | Serif | 22 | 400 | 1    | -0.01em | — |
| Tagline           | Serif italic | 15 | 400 | 1.4 | 0 | — (settings foot) |
| Quest title / item name | Sans | 17 / 16 | 450 | 1.4 (1.3 names) | 0 | `text-quest` |
| Body              | Sans | 16 | 400 | 1.5 | 0 | `text-body` |
| Button, segment, stepper value | Sans | 15 | 500 | 1 | 0 (values +0.01em) | — |
| Small             | Sans | 13 | 500 | 1.4 | +0.004em | `text-small` |
| Numerals          | Sans | 15 | 500 | 1 | +0.01em | `text-numeral`, always `tabular-nums` |

Clock numerals: font-size 15 in the 400 viewBox (16.5px at the 440px clock), weight 500,
`fill: ink; fill-opacity: .8`, tabular. Instrument Sans figures verified at 13–16.5px:
lining, even color, `tnum` works, 1 and 7 distinct. Kept.

## 4. Spacing, radii, lines, focus

Spacing (px): 2, 4, 8, 12, 14, 16, 20, 24, 28, 32, 40, 48, 64, 96. Tailwind `--spacing`
is 0.25rem.

| Radius | Used by |
| ------ | ------- |
| 0      | Quest log, rows, seven-day row, header, hero, rail, mobile sheet (they are not boxes) |
| 6      | Checkbox |
| 10     | Add-quest well, stepper, buttons, rail icon hit area, close button |
| 18     | Confirm dialog |
| 22     | Panel, left corners only |
| 999    | Seven-day discs, sky strips, "Repeats daily" chip, lumen ring, segment underline |

`--radius-thumb` (14) and `--radius-segment` (8) remain in tokens for name stability but
are unused in revision 2: no dial tiles, no segmented thumb.

Lines: 1px, `border-top` or `box-shadow: inset 0 0 0 1px`; never a full border on a filled
box; never 2px except the focus ring and the segment underline.

Focus: `outline: 2px solid var(--hour-ink); outline-offset: 3px`, on `:focus-visible` only.
No `border-radius` in the rule: the outline follows each element's own radius (drawn on the fourth row's checkbox in `light-14.html`).

## 5. Light recipes (exact CSS in surfaces.css)

**Page:** `linear-gradient(170deg, var(--page-wash), transparent var(--wash-stop))` over
`linear-gradient(170deg, paper 0%, mix(paper 55%, mist) 55%, mist 100%)`, fixed. In light
the wash is fixed blue-grey; in dark it is the hour.

**Aurora:** three fixed blobs in a `filter: blur(48px)` container. A: 68vw (min 640) at
`left:-14vw; top:-22vw`, `--aurora-a-tint` at α / α·.45 at 38% / 0 at 70%, drift
`translate(6vw,4vw) scale(1.08)` 84s. B: 56vw (min 520) at `right:-18vw; bottom:-26vw`,
`--aurora-b-tint` at α·.8 / α·.3 at 40% / 0 at 70%, 96s. C: 34vw (min 320) at `right:8vw;
top:-12vw`, `--aurora-c-tint` at α·.5 / 0 at 68%, 68s. Tints are fixed blue-grey in light
and the hour in dark (§1). α = `--aurora-alpha`. All
`var(--ease-glide) infinite alternate`; frozen under reduced motion.

**Halo:** `.halo`, first child of the clock box, `inset:-30%`, `filter: blur(22px)`,
radial at (`--halo-x`, `--halo-y`), `--hour-glow` at halo-α × 1 / .62 / .28 / .08 / 0 at
0 / 18 / 36 / 52 / 66%. Origin: `a = (hour%12 + .5)·30°`, `x = 50 + 16·sin(a)` %,
`y = 50 − 16·cos(a)` %, so the light comes from the lit section. In light the halo is a
whiter spot on the blue-washed page; in dark it is the hour's color.

**Grain:** `.grain`, second child of the clock box (above the halo, below the SVG),
`inset:-22%`, `border-radius:50%`, `mask: radial-gradient(closest-side, black 45%,
transparent)` (zero at the box edge, no seam, ~0 by the hour word). Tile: 240px SVG
`feTurbulence fractalNoise baseFrequency .9 numOctaves 2`, `feColorMatrix` to luminance
noise centered on 50% grey (`0.9 0.9 0.9 0 -0.85` ×3, alpha 1), `mix-blend-mode: overlay`
(no mean shift), opacity `--grain-alpha`. Measured high-pass sd of 8-bit luma on the bare
clock face: dark 2.58 min / 2.91 median; light 10h 3.24 / 3.56; noon 2.60 / 2.79; 16h
2.84 / 3.20; outside the hero ≤ 0.67.

**Glass (panel only):** `background: var(--glass)`, `backdrop-filter: blur(28px)
saturate(1.35)`, `box-shadow: inset 0 0 0 1px var(--line), inset 0 1px 0
mix(ink 6%, transparent), var(--shadow-panel)`. Nothing else is translucent.

## 6. Clock

400×400 viewBox, center (200,200), 12 up. Rendered size: `width: min(100%, max(380px,
min(440px, 52vh)))`; at ≥1600w and ≥960h the 440 becomes 480; at ≤760 `min(100%, 320px)`.

- **Bezel:** circle r 189.5, 1px `line`.
- **Sections:** 12 annular arcs, outer r 186, inner r 158 (band 28), each 30° minus a 1.5°
  gap (0.75° per side). Section i spans hour i to i+1.
- **Unlit tint:** `fill: color-mix(in oklab, color-mix(in oklab, <lap stop> 55%,
  var(--slate)) var(--ring-tint), transparent)`. The lap is stops 0–11 before noon and
  12–23 after, so mornings and evenings tint differently. Squint test: only the lit wedge,
  halo, and hands survive.
- **Lit section:** drawn in this order: (1) the wedge blurred `stdDeviation 16`, fill
  `--hour-bloom`, opacity `--glow-far`, filter region -60% / 220%; (2) blurred 6, same
  fill, opacity `--glow-near`, region -40% / 180%; (3) the unlit sections; (4) the wedge,
  fill `--hour-fill`; (5) outer highlight arc r 184, inset 1.5° each end, 1px white at
  `--edge-alpha`; (6) inner arc r 158.5, inset 1°, 1px `--hour-fill` at `--wedge-edge`.
- **Ticks:** 12 hour ticks r 152→143, 1.5, `ink`, round caps; 48 minute ticks r 151→147,
  1, `pewter` at .55.
- **Numerals:** r 126 (§3). In 24h mode the PM lap shows 13–24 (12 stays 12 at noon lap).
- **Hands:** hour 6 wide, 92 long + 14 tail; minute 4 wide, **146** + 18 (the tip reaches
  the minute track at r 147–151 and crosses the numerals instead of stubbing into them;
  same on Rays); both `ink`, round caps. Second 1.5 wide, 148 + 26, `--hour-fill`. Cap: r 9.5 `--hour-fill` at .35, r 8
  `paper`, r 5.5 `ink`.
- **Second hand:** sweep (rAF, default), tick (180ms `cubic-bezier(.4,2,.5,1)` per
  second), hidden.
- **Top of the hour:** the old wedge fades to its tint and the new one rises over 1200ms
  `--ease-dawn`; halo, aurora, and every `--hour-*` follow via a 1200ms transition.

Dial variants (same glow stack: near + far bloom copies under the lit mark):

**Sector** (default). As above.

**Hairline.** Ring r 172, 1px `line-strong`. Twelve hour ticks r 178→164, 1.5 `ink`;
sixty minute ticks r 176→172, 1 `pewter` .5. No sections. Lit: a 3px arc at r 172 across
the hour (inset 1°), `--hour-fill`, round caps.

**Rays.** Twelve radial lines r 124→184 at the section centers, 1.5, `slate` at .55,
round caps. Lit ray 3 wide `--hour-fill`. Numerals move to r 104. No minute ticks.

**Lantern.** Twelve full wedges r 0→186, no gaps, no outlines, each filled
`color-mix(in oklab, color-mix(in oklab, <lap stop> 25%, var(--slate)) var(--lantern-tint),
transparent)` (tint 7% light, 9% dark), so the unlit face is one soft disc, never two halves.
Lit wedge: radial gradient `--hour-fill` 0 at center → .85 at the rim. Cap grows to r 7.

**Orbit.** 1px `line-strong` ring r 172; twelve dots r 5.5 at the section centers filled
`--orbit-dot` (slate at 40% light / 32% dark), so the structure reads; lit dot r 9
`--hour-fill`, breathing `scale 1→1.12` 4s `--ease-glide` (off under reduced
motion). No numerals.

## 7. Layout

- **Shell:** `max-width: calc(1120px + 64px + 80px)`, centered, `padding: 0 104px 48px
  40px` (40 gutters + 64 rail). At ≥1600: content 1400, `grid-template-columns: 1fr 1fr`,
  gap 128, and the hero hugs the centre gutter: `.hero { justify-self: end; width:
  max(380px, min(440px, 52vh)) }` (480 when also ≥960 tall), clock at 100% of it, words
  left-aligned to the clock.
- **Header:** 56px, `border-bottom: 1px line`.
- **Grid:** `55fr 45fr`, gap 64, `align-items: start`, `align-content: center`,
  `min-height: calc(100vh - 56px - 48px)`, padding 24 0. The composition sits at the
  optical center; free space splits above and below.
- **Hero:** clock box (§6), then hour word 28px below, personality line 12px below that,
  left-aligned to the clock.
- **761–1180:** `1fr 1fr`, gap 40; "repeats daily" moves under the title (flex-basis
  100%, padding-left 36).
- **≤760:** `padding: 0 56px 32px 12px` (12 gutters + 44 rail); one column, gap 36,
  no min-height, padding-top 24; clock `min(100%, 320px)` centered; words centered, hour
  word 40, personality 19; date hidden (time stays); rows min-height 48, title 16; rail 44
  wide with 36px buttons; panel becomes a full-screen sheet (radius 0, padding 20 16 24).

## 8. Components

**Header.** Wordmark left; right: date small `slate` ("Wednesday, 17 September"), 20px
gap, time 15/500 tabular `ink` ("7:42 pm").

**Hero.** No box, no border. Halo + grain + SVG in the clock box; words below.

**Quest log.** No fill, no radius, no shadow. Head: "Today's log" serif 26, count 15/500
tabular `slate` right, 12px below the head. Rows: `display:flex; align-items:flex-start;
gap:14px; min-height:52px; padding:12px 6px 12px 2px; margin:0 -6px 0 -2px` (so the hover
wash bleeds past the text edge), `border-top: 1px line`; first row `line-strong`.
Checkbox 22px, radius 6, margin-top 1, `inset 0 0 0 1px line-strong`; checked: fill
`--hour-fill`, no border, check path `M2.5 7.5l3 3 6-7` 1.8 stroke `paper` in a 14px box.
Checked title `slate`, no strikethrough. Meta "repeats daily" small `pewter`, padding-top 4.
**Hover:** row background `--hour-wash`, "Remove" (small `pewter`) appears right. **Focus:**
2px `--hour-ink` ring, offset 3, on the checkbox.

Check-off: `check-fill` (scale 1→.88→1, 320ms `--ease-lift`) while the fill transitions to
`--hour-fill`; `check-draw` (`stroke-dasharray:24`, offset 24→0, 320ms `--ease-settle`);
`lumen-rise` (900ms, `linear`: opacity 0→1 by 12%, holds to 65%, out at 100%; translateY
4 → 0 → −8 → −14px) floats "+1" 13/600 tabular `--hour-ink`, centred over the box
(`left: 13px; top: -8px; translate: -50% 0`).

**Add-quest well.** 16px below the rows; 44px, radius 10, `surface`, `inset 0 0 0 1px
line-strong`, padding 0 14. Placeholder "Add a quest" 16 `pewter`. Right: "Repeats daily"
chip (small `slate`, padding 4 10, radius 999, inset 1px `line`; on: fill `--hour-soft`,
text `ink`). Focus: border `--hour-ink`. Enter adds; no Add button.

**Seven-day row.** 28px below the well, discs 24px boxes, gap 20, today rightmost. Each:
disc r 8 filled `--hour-fill` at `fill-opacity: max(.15, share)` (no fill at 0), then a
ring r 8 1.5 `line-strong` on top. Today: extra ring r 10.5, 1px `--hour-soft`. Weekday
initial small `pewter`, 6px below. Filled by light, never by angle.

**Rail.** Fixed right, 64 wide, `border-left: 1px line`, background `mix(paper 70%,
transparent)` so the aurora shows through, padding 12 0 16. Buttons 40px radius 10, 8px
apart, icons 22px, 1.5 stroke `slate`, round joins. Active: icon `ink` plus a 4px
`--hour-fill` dot 6px left of the button, `box-shadow: 0 0 8px --hour-soft`. Hover:
`--hour-wash`. Press: `scale(.98)`. Icons: Today, a circle r 9 with hands `M12 7v5l3 2`;
Collection, a circle r 8.5 with a 3px `--hour-fill` arc from 10 to 11 o'clock (300°→330°)
and a 1.5 dot at radius 4, 315° (a dial and its lit hour); Settings, three lines with
knobs at 9/15/8. Lumen balance at the bottom: not a badge. The count
in 13/500 tabular `slate`, with the rail's own 4px `--hour-fill` lit dot 6px above it
(`box-shadow: 0 0 8px --hour-soft`); tooltip "12 lumens".

**Panel.** Fixed `top:12; bottom:12; right:64`, 380 wide, radius `22 0 0 22`, padding
24 28 28, `glass`, scrolls with no visible scrollbar, flex column. Head: serif 26 title,
close "×" 22px `slate` in a 28px radius-10 button. Page behind gets a scrim `mix(paper
35%, transparent)`. Motion: `panel-in` 320ms `--ease-settle` / `panel-out` 200ms
`--ease-glide`; mobile `sheet-in`.

**Collection.** Balance sentence body `slate` 10px under the title. Group titles serif 19,
margin 28 0 6, padding-top 14, `border-top: 1px line`.
- *Dials:* the equipped dial first, drawn once at 168px as a live preview (real time, real
  sky; Sector preview omits numerals and minute ticks), with name (17/450), description
  (13 `slate`), and "Equipped" beside it, gap 20. Below, the other four as rows:
  min-height 66, padding 6 0, gap 14, `border-top: 1px line`; the dial drawn straight on
  the glass at 64px (no tile, no fill, no border), lit at hour 10 with its glow; name,
  description, state right. The 64px art uses heavier strokes than §6 so it survives the
  scale (viewBox units): Sector band 186→150, gap 3°; Hairline ring 6 `line-strong`, ticks
  r 180→160 at 9, lit arc 18; Rays r 118→184 at 9 `slate` .55, lit 18; Lantern tints 7%;
  Orbit ring 6 `line`, dots r 16, lit r 28. Glow: the near blur copy only.
- *Skies:* rows padding 10 0, hairline between; name and state on one line, then a 200×6
  strip, radius 999, `linear-gradient(90deg, stop0 0%, stop1 4.35%, … stop23 100%)`, then
  the description (13 `slate`). The equipped sky gets a 1×4 `ink` tick 4px below the strip
  at `(hour + .5) / 24 · 200px`.
- *States:* owned → "Equip" in `--hour-ink`; equipped → 5px `--hour-fill` dot + "Equipped"
  `slate`; locked → art/strip at .55 opacity, price "8 lumens" small `pewter`, "Buy" in
  `--hour-ink` only when affordable. No badges, no lock icons.

**Settings.** Rows: min-height 56, padding 8 0, `border-top: 1px line` (none on the
first); label body `ink` left, control right.
- *Segmented choice* (Theme, Second hand, Clock labels, Reduce motion): options as plain
  text 15/500 `slate`, 18px apart, padding 4 0 8. Selected: `ink` with a 2px
  `--hour-fill` underline (radius 999, `0 0 8px --hour-soft`), class `.lit-underline`.
  No track, no pill, no thumb, no shadow. Reduce motion is "Off / On" in the same control.
- *Stepper* (Day begins, Night begins): 36px tall, radius 10, `inset 0 0 0 1px
  line-strong`; "−" and "+" 32×36 in `slate` 18px; value 56px min, tabular 15/500; steps
  by one hour. The value follows Clock labels: "6 am" / "7 pm" in 12h, "6:00" / "19:00" in
  24h.
- *Clear all data:* 28px below the rows with a hairline above, a text button 15/500
  `pewter`. The tagline sits at the panel foot, serif italic 15 `slate`.

**Confirm dialog.** Centered, 360 (max `100vw − 32`), radius 18, `paper` (opaque), dialog
shadow, padding 24 24 20; title serif 26, body 16 `slate`; actions right, gap 8, 20px
above: "Cancel" (40px, padding 0 14, radius 10, `slate`) and "Clear everything" (same box,
fill `ink`, text `paper`). Backdrop `--dialog-backdrop`. Opens with `light-on` 200ms.

**Empty states.** Log: "Nothing on the log yet." body `slate` where the rows go, well
below it. Collection with everything owned: "You have the whole collection." Seven-day
with no history: outlines only.

## 9. Motion

| Name | Value | Use |
| ---- | ----- | --- |
| swift | 120ms | hover fills, focus ring, press |
| quick | 200ms | panel-out, segment underline slide, dialog in |
| settle | 320ms | check-off, panel-in, row remove |
| slow | 600ms | hour word crossfade |
| dawn | 1200ms | lit section handoff, `--hour` recolor, load |
| `--ease-settle` | `cubic-bezier(.25,1,.5,1)` | arrivals |
| `--ease-glide` | `cubic-bezier(.65,0,.35,1)` | aurora drift, departures |
| `--ease-lift` | `cubic-bezier(.34,1.4,.64,1)` | the checkbox squeeze only |
| `--ease-dawn` | `cubic-bezier(.4,0,.2,1)` | light changes |

Load, the one orchestrated moment: the page renders still, then halo, lit wedge, and glow
fade in over 1200ms (`light-on`) and the hour word and line rise 4px over 600ms from 240ms
(`word-in`). Nothing else enters or staggers. Reduced motion (OS or setting, via
`[data-reduce-motion="true"]` on `<html>`): aurora frozen, no breathing, entrances 1ms,
second hand forced to tick, hour handoff is a cut.

## 10. Copy

Header: wordmark "Hourly". Date "Wednesday, 17 September". Tagline (settings foot, the only
place it appears): "Every hour gets its own color."

| h  | Hour word         | Personality line                                     |
| -- | ----------------- | ---------------------------------------------------- |
| 0  | Midnight          | The day has changed its mind about being over.       |
| 1  | Deep night        | Nothing here needs you until morning.                |
| 2  | The small hours   | Quiet enough to hear the second hand.                |
| 3  | Still night       | Whatever it is can wait for light.                   |
| 4  | Before dawn       | The log resets now. Yesterday is filed.              |
| 5  | First light       | The sky is thinking about it.                        |
| 6  | Dawn              | The first color of the day is a soft one.            |
| 7  | Sunrise           | Coffee first, then the log.                          |
| 8  | Early morning     | A good hour for the hardest quest.                   |
| 9  | Morning           | The day is fully awake now, and so are you.          |
| 10 | Late morning      | The best light of the day for getting things done.   |
| 11 | Almost noon       | One more thing before lunch.                         |
| 12 | Noon              | The clock strikes gold.                              |
| 13 | Early afternoon   | A slow hour, on purpose.                             |
| 14 | Afternoon         | Half the day is still yours.                         |
| 15 | Mid afternoon     | A good moment for a short walk.                      |
| 16 | Late afternoon    | The light is starting to lean.                       |
| 17 | Golden hour       | Everything looks better in this one.                 |
| 18 | Sunset            | Finish what is small, leave what is large.           |
| 19 | Evening           | The day is winding down, and the light with it.      |
| 20 | Dusk              | Lamps on, screens dimmer.                            |
| 21 | Night             | Whatever is left can be tomorrow's.                  |
| 22 | Late night        | The log will still be here in the morning.           |
| 23 | Nearly midnight   | Last light of the day. Rest.                         |

Quest log: title "Today's log"; count "2 of 5"; all done "Cleared."; empty "Nothing on the
log yet."; placeholder "Add a quest"; chip "Repeats daily"; row meta "repeats daily"; row
action "Remove"; lumen float "+1"; clean-day toast "A clean day. +2 lumens."

Rail tooltips: "Today", "Collection", "Settings", "12 lumens".

Settings: title "Settings"; rows "Theme" (Auto / Light / Dark), "Day begins", "Night
begins", "Second hand" (Sweep / Tick / Hidden), "Clock labels" (12h / 24h), "Reduce motion"
(Off / On); button "Clear all data"; dialog title "Clear all data?", body "Quests, lumens,
and your collection will be removed from this browser.", buttons "Cancel" / "Clear
everything". Stepper buttons are labelled "Earlier" / "Later" for screen readers.

Collection: title "Collection"; balance "You have 12 lumens, 31 earned in all."; groups
"Dials", "Skies"; states "Equipped", "Equip", "Buy"; price "8 lumens"; all owned "You have
the whole collection."

Dials: Sector, "Filled arcs. The lit hour is a solid wedge of light." (default); Hairline,
"A thin ring and ticks. The lit hour is a bright arc." 6 lumens; Rays, "Twelve lines from
the center. The lit one glows." 8 lumens; Lantern, "Soft wedges with no edges, lit from
within." 10 lumens; Orbit, "Twelve points around the hour. The lit one swells." 12 lumens.

Skies: Daylight, "Indigo to gold and back, the way a day goes." (default); Ember, "Warm all
day, from wine to apricot to coal." 8 lumens; Tide, "Sea glass and deep water." 8 lumens;
Graphite, "Everything grey, so the lit hour is the only color." 10 lumens.

## 11. Reference renderings

`docs/mockup/`: `index.html` (19:42 dark), `light.html` (10:14), `light-12.html` (noon),
`light-14.html` (14:23, with row hover and checkbox focus drawn), `light-16.html` (16:48),
`panel.html` (Collection over dark), `settings.html` (Settings with the confirm dialog open,
hover drawn on the log behind). Screenshots of each at 1440×900, 1920×1080, 1024×768,
390×844, 360×740 in `docs/screenshots/mockup-<page>-<w>x<h>.png`.
