# Critique 01 — design director's static mockups

Reviewed: `docs/mockup/{index,light,panel}.html`, `mockup.css`, `src/styles/{tokens,surfaces}.css`,
the six PNGs in `docs/screenshots/mockup-*.png`, plus my own captures in `docs/critique/shots/`
(1920×1080, 1024×768, 360×740 full-page, and 2× crops of both clocks). Contrast figures below
are measured from pixel samples of the actual rendered backgrounds (aurora + wash + halo), not
from the flat `paper`/`mist` hexes, because nothing in this app sits on flat paper.

## Verdict

The dark mockup is close to the brief and clearly not the previous build's problem: the lit
wedge, its two-blur glow, and a halo whose origin is computed from the lit section make the
clock read as an instrument with a light source, the serif/sans pairing carries the voice, and
the log is a disciplined hairlined list with no box. It is not shippable yet for four reasons.
The light theme, which is what the app shows for thirteen hours a day, does not deliver the one
idea: the "lit" section sits at 1.5–2.5:1 against the page, the halo dissolves into a pale blue
wallpaper, and the ring reads as a pastel donut chart. Small text fails AA on the real washed
backgrounds in both themes (pewter 4.1:1, hour-ink 3.97:1, clock numerals down to 3.2:1). The
composition is top-heavy: at 1440×900 the lower third is empty and at 1920 the content floats
370px from its own rail. And the Collection panel falls back into exactly the patterns the brief
banned in miniature: five identical rounded thumbnail tiles, legend-style colour strips, and a
four-point AI-sparkle icon for the section itself.

## Findings, by severity

### 1. Light theme: the lit section is not lit (blocker)

**Where.** `light.html`, the `path.light-on[style="fill: var(--hour)"]` wedge and `.halo`;
`docs/screenshots/mockup-light-1440x900.png`, the 10–11 o'clock wedge; `shots/light-clock-2x.png`.

**What.** Measured contrast of the lit fill against `paper #F1F4F9` by Daylight stop: 9h 2.0,
10h 2.5, 11h 1.95, 12h (gold `#E8B93F`) 1.66, 13h 1.55, 14h (straw `#DBC784`) 1.52, 15h 1.79,
16h 2.0. The wedge is a mid-blue chip at 10:14 and will be a barely-there yellow from noon to
four. The halo (`--hour-glow` = hour 55% + white 10%, so 65% alpha of a blue) adds *more blue*
to an already blue page: top-left of the light page samples `#CCDFF1`, bottom-right `#CFDEEB`,
i.e. the whole viewport is one flat pale blue and the "spot of light" is indistinguishable from
the ambient. In the 2× crop the glow filter around the wedge is invisible.

**Why it reads generic.** Without a lit/unlit difference the light-mode hero is a pastel
segmented ring on a light-blue gradient, which is the stock "soft SaaS dashboard" look. The
brief's one memorable thing only happens after 19:00.

**Fix (design).**
- Add a light-theme fill token distinct from the glow: `--hour-fill: color-mix(in oklab,
  var(--hour) 82%, var(--ink))` and use it for the wedge, second hand, checked box, and
  seven-day fills. Noon becomes ≈`#C49B3A` (≈3.0:1 on paper); 10h ≈`#5289B9` (≈3.6:1). Dark
  theme keeps `--hour-fill: var(--hour)`.
- Make the light halo read as *light*, not as tint: `--hour-glow` light →
  `color-mix(in oklab, var(--hour) 40%, white 40%)`, `--halo-alpha` .48 → .70. The goal is a
  paler, whiter spot on the page around the lit section, with the page darkening away from it.
- Raise the light glow filters: `--glow-near .75 → .9`, `--glow-far .45 → .6`.
- Stroke the wedge's inner arc (r 158) with `--hour-fill` at .45, 1px, in light only, so the
  wedge has an edge against the halo.
- Render hours 12, 14, 16 in light before implementation starts and attach them to the mockups.

### 2. The ring reads as a donut chart in both themes (blocker)

**Where.** `index.html` / `light.html`, the `<g>` of eleven `color-mix(... var(--ring-tint),
transparent)` paths; `shots/dark-clock-2x.png`, `shots/light-clock-2x.png`.

**What.** Dark: the PM lap's golds and ambers (`#E8B93F`, `#E6C35C`, `#DBC784` …) at 19% over
navy and a pink halo produce khaki/olive/brown segments (sampled ≈`#6E4B3E` at 1–4 o'clock).
Mustard on plum is the least premium colour relationship on the page, and it occupies half the
hero. Light: twelve clearly delineated pastel segments (peach, lilac, sky) with crisp 3° gaps,
which is the literal drawing of a donut chart. In both themes the eye reads "12 categories with
values" before it reads "clock". The brief said *faint* tints; these are not faint.

**Fix (design for values, engineer for the generator).**
- `--ring-tint`: dark 19% → 11%, light 26% → 15%.
- Desaturate the lap stop before applying alpha so the ring is a hue whisper, not a swatch:
  `fill: color-mix(in oklab, color-mix(in oklab, <stop> 55%, var(--slate)) var(--ring-tint), transparent)`.
- Gap 3° → 1.5° (0.75° per side). The divider should be felt, not counted.
- Acceptance test: squint at the hero; only the lit wedge, the halo, and the hands should
  survive. If the 1–4 o'clock segments are still individually legible, the tint is too high.

### 3. Text contrast fails on the real backgrounds (blocker: quality floor is WCAG AA)

**Where.** `tokens.css` `:root` and `[data-theme="dark"]`; DESIGN.md §1 (its 4.6:1 / 4.9:1
claims are computed against flat paper and are wrong for this page).

Measured (13px/500 and 15–16.5px text unless noted):

| Text | Colour | Worst sampled bg | Ratio | Needs |
| --- | --- | --- | --- | --- |
| light "repeats daily", weekday letters, prices | pewter `#5F6C85` | `#DBE4EF` (hour word area) / `#E0E9F3` | **4.1 / 4.3** | 4.5 |
| light "Equip", "Buy", links | hour-ink `≈#45729B` (10h) | mist `#DDE4EE` | **3.97** | 4.5 |
| light hour-ink at noon | `≈#9A803A` | mist | **2.97** | 4.5 |
| light clock numerals (16.5px) | slate `#56637A` | halo `#AFCFEB` | **3.7–4.0** | 4.5 |
| dark clock numerals | slate `#A3AEC2` | halo `#774B5B` / `#6E404F` | **3.2 / 3.7** | 4.5 |
| dark prices on glass over halo | pewter `#7E8AA0` | `#272B3E` | **4.0** | 4.5 |
| light check glyph (non-text) | paper on `#5EA3DC` | — | **2.46** (noon 1.66) | 3.0 |

Passing and fine: ink everywhere (≥6.1), slate body/secondary in both themes (≥4.7 light,
≥5.4 dark), dark hour-ink (`≈#DBA3B1`, 8.1 on glass).

**Fix (design; engineer just consumes tokens).**
- Light `--pewter` `#5F6C85` → `#4F5C74` (5.25 on the worst sample, 6.1 on paper).
- Dark `--pewter` `#7E8AA0` → `#8A96AC` (4.7 on glass-over-halo, 5.0 elsewhere).
- Light `--hour-ink`: 62% → 40% hour (`≈#365675` at 10h, 6.0; `≈#6D5F37` at noon, 4.9). This
  keeps a visible hour cast while clearing AA at every stop.
- Clock numerals: fill `var(--ink)` at `opacity: .8` in both themes (light ≈5.2 on halo,
  dark ≈4.6). Slate is not viable over a halo.
- Checked box in light: fill `--hour-fill` (from finding 1) and draw the check in `paper`;
  at noon that is ≈3.6:1. Alternatively draw the check in `ink` on the raw hour fill.
- Rewrite the contrast claims in DESIGN.md §1 against the washed page, not paper.

### 4. Dead lower third at 1440×900; orphaned composition at 1920 (major)

**Where.** `mockup.css` `.shell`, `.grid`; `docs/screenshots/mockup-index-1440x900.png`
(y 665–900 empty on the left, y 540–900 empty on the right); `shots/index-1920.png`.

**What.** At 1440×900 the hero column ends at y≈665 and the log at y≈540; 26% of the viewport
under the hour word and 40% under the week row is undifferentiated gradient. The eye lands on
the clock and then falls off the bottom of the content into nothing. At 1920×1080 the shell is
centred at `max-width: 1264px`, so the content block spans x 368–1488 while the rail sits at
x 1856: a 370px void between the log and the nav that belongs to it, and the rail's active dot
floats in space. That is the layout an unopinionated container gives you, and it reads that way.

**Fix (design decides, engineer implements).**
- Centre the composition in the space below the header: `.grid { min-height: calc(100vh -
  56px - 48px); align-content: center; }`. The clock, hour word, and log then sit in the
  viewport's optical centre, and the empty space is split above and below instead of piling
  up underneath.
- Let the hero use the height it has: `.clock-wrap { width: min(100%, 440px, 52vh); }` and lift
  the cap to 480px when `(min-height: 960px) and (min-width: 1600px)`.
- At ≥1600px, tie the content to its rail: `.shell { max-width: 1400px; }` and `.grid { gap:
  96px; }` so the content grows toward the rail instead of leaving a corridor. Do not
  right-anchor the shell; a 650px left margin is worse.

### 5. The Collection icon is the AI sparkle (major)

**Where.** `index.html` `nav.rail button[aria-label="Collection"] svg path`
(`M12 3c.6 5 4 8.4 9 9 …`), `docs/screenshots/mockup-panel-1440x900.png` rail, second icon.

**What.** A four-point star with concave sides. Across every product shipped in the last three
years this glyph means "AI feature". A design-literate person sees it and files the whole app
under "generated". It also says nothing about dials or skies.

**Fix (design).** Draw the icon from the app's own vocabulary at 1.5px stroke in `slate`: a
circle r 8.5 with one 3px lit arc from 10 to 11 o'clock in `--hour` plus a small filled dot r 1.5
at radius 4 (a dial and a sky in one mark); or two overlapping circles r 6 offset 4px (a dial
over a sky). Either one is unique to Hourly.

### 6. Dials are five identical rounded tiles with illegible thumbnails (major)

**Where.** `mockup.css` `.thumb` (56px, `border-radius: 14px`, `surface` fill, inset hairline)
× 5; `panel.html` lines 80–84; `mockup-panel-1440x900.png` Dials list.

**What.** The brief bans "identical rounded cards with the same soft shadow repeated
everywhere". This is that pattern at 56px: five identical rounded squares, same fill, same
hairline, same corner radius, stacked. And at 48px the drawings inside do not distinguish the
dials: Sector reads as a donut chart, Hairline as a dotted circle, Orbit as scattered dots,
Rays as a loading spinner. The row's only real information (what this dial looks like on my
clock) is the part that is unreadable.

**Fix (design).**
- Kill the tile: `.thumb { background: none; box-shadow: none; width: 64px; height: 64px; }`.
  Draw the dial directly on the glass at 64px with its lit section actually glowing (the same
  `#glow-near` filter), lit at hour 10 as the spec says.
- Give the section a hero: the currently equipped dial is drawn once at 168px at the top of
  "Dials" as a live preview (hands at the real time), and the list below shows only the other
  four. This breaks the five-identical-rows rhythm and makes "Equip" instantly legible: you
  tap and the big preview changes.
- Keep the row heights, hairlines, and text exactly as they are; the type in the rows is fine.

### 7. Skies strips read as data-viz legends (moderate)

**Where.** `mockup.css` `.strip` (24 `<i>` blocks, 10px tall, full width, `overflow: hidden`);
`panel.html` lines 86–89.

**What.** Twenty-four hard-stepped bars in a pill are a colour-picker ramp or a chart legend.
The app's light changes continuously through the day; the strip should look like that day, not
like a swatch book. Also: DESIGN.md §7 says 200px wide and 8px stops; the mockup uses 100%.

**Fix (design).** `background: linear-gradient(90deg, stop0 0%, stop1 4.35%, … stop23 100%)`,
6px tall, `border-radius: 999px`, width 200px as specified. Mark the current hour on the
equipped sky with a 1px `ink` tick 4px below the strip at the hour's position; the others get
no tick. Locked skies at `.55` opacity is fine.

### 8. The grain is not there (moderate)

**Where.** `surfaces.css` `.grain` (`opacity: .055`, `soft-light`); `tokens.css`
`--grain-alpha`.

**What.** Standard deviation of luminance in a flat patch of the dark hero is 0.9 (light 0.7),
i.e. no perceptible noise at all; the region outside the hero (with gradient) measures 3.3. At
.055 soft-light the effect is below the 8-bit floor. The brief asked for "subtle grain on the
hero surface"; right now it is a paint cost with no visual return, and without it the big
radial gradients are exactly the banding-prone smooth blobs DESIGN.md §5 warns about.

**Fix (design).** `--grain-alpha` .055 → .11 light with `mix-blend-mode: multiply`, .085 →
.16 dark with `overlay`; verify a flat hero patch measures sd ≥ 2.5 before locking. If it still
does not read, delete the layer rather than ship a placebo.

### 9. Seven-day rings are seven tiny pie charts (moderate)

**Where.** `index.html` `.week .day svg path` (`M12 12 L12 4 A8 8 …` wedges from 12 o'clock);
`mockup-index-1440x900.png` under the add-quest well.

**What.** The brief decided "small rings, filled by how much of that day was cleared"; that is
not reopened. The execution, a wedge swept from twelve o'clock, is the pie-chart idiom, and a
row of seven Pac-Men is a stat widget. It is the one place the app draws "progress" the way a
dashboard would.

**Fix (design).** Fill by light, not by angle, which is also the app's own metaphor: disc fill
`--hour-fill` at `opacity: max(.15, share)`; a clean day is solid and gets the r 10 `--hour-soft`
ring already specified; an empty day stays an outline. The ring stroke stays `line-strong`.

### 10. The log column collapses at 1024 and 360 (moderate)

**Where.** `mockup.css` `.grid` (`55fr 45fr`, gap 64) and the `@media (max-width: 760px)`
block; `shots/light-1024.png`, `shots/index-360-full.png`.

**What.** At 1024×768 the log column is ≈370px: "Drink a glass of water before / coffee" and
"Water the fig and the two / ferns" wrap to two lines while "repeats daily" hangs at the right
edge, and the checked box is vertically centred against a two-line title, so the row looks
broken. At 360px the 48px rail plus 16px gutters leave 280px of content: the clock renders at
280px (brief: up to 320), and every title over about 26 characters wraps.

**Fix (design).**
- Between 761 and 1180px: `grid-template-columns: 1fr 1fr; gap: 40px;` and move the meta
  under the title (the ≤760 rule) at ≤1180 instead.
- Mobile: rail 44px, gutters 12px (`padding: 0 calc(44px + 12px) 32px 12px`), giving 304px
  of content; `.row { align-items: flex-start; padding-top: 12px }` so the box aligns to the
  first line when a title wraps.

### 11. DESIGN.md and the mockup disagree on values (moderate, blocks engineering)

**Where.** DESIGN.md §6 says section band 28 (186→158) and, four paragraphs later, "band 36"
for the Sector dial; §7 dial thumbnail 64 vs `.thumb` 56; item row 84 vs `.item` 66; lumen ring
22 vs `.lumens` 26; sky strip 200px vs 100%; clock numerals "font-size 15 … clock labels 13 at
500" (which is it in the viewBox?); `.rail` in the mockup has a 70% `paper` fill that §7 does
not mention.

**Why it matters.** The engineer will pick one per case and be wrong half the time, and each
wrong pick is a review round. **Fix (design).** Reconcile DESIGN.md to the mockup, or the
mockup to DESIGN.md, in one pass before the engineer touches `src/components`.

### 12. Settings, the confirm dialog, and every state are unmocked (moderate)

**Where.** No `settings.html`; no hover, focus, empty, cleared, or clean-day toast in any
mockup.

**Why it matters.** Segmented controls, toggles, and steppers are exactly where template chrome
creeps back in (a default Tailwind toggle, a pill segmented control with a drop shadow), and
"Clear all data?" is the app's only modal. The engineer will build these from the prose in
DESIGN.md §7 and the result will be a generic settings sheet inside a premium app.
**Fix (design).** One `settings.html` with the panel, all six rows, the dialog open, and a
hover and a focus-visible state drawn on the log, before those components are built.

### 13. Panel heading sizes are one step too close (minor)

**Where.** `mockup.css` `.panel-title` 26px vs `.group-title` 22px; `mockup-panel-390x844.png`.

**What.** A 4px step between the panel title and its two sub-headings is not a level; on the
phone "Dials" and "Skies" read as more panel titles. **Fix (design).** `.group-title { font-size:
19px; margin: 32px 0 6px; }` with a `rule` hairline above each group.

## Working, and to be protected during implementation

- **The dark hero's light model.** Lit wedge at 100% + two blurred copies (`stdDeviation` 6
  at .75 and 16 at .45) + a halo whose origin is `50 + 16·sin(a)`, `50 − 16·cos(a)` so the
  light visibly comes from the lit section, + the `light-on` load moment. Engineer: keep the
  halo-origin math and the single orchestrated load; do not add per-section entrances.
- **The flat log.** No box, radius 0, `border-top` hairlines, `line-strong` only on the first
  row, title in serif with the count right-aligned in tabular figures, the meta as plain
  lower-case sans. This is the strongest "not a card" statement on the page. Do not wrap it
  in a container, and do not add a shadow.
- **The pairing and the copy.** Instrument Serif 56 "Evening" with the italic 22 personality
  line under it, sans for everything operational; "You have 12 lumens, 31 earned in all." as a
  sentence, not a stat; "repeats daily", "Add a quest", "Nothing on the log yet." Ship the copy
  table verbatim; no exclamation marks, no emoji, no "→".
- **Radius and shadow discipline.** One radius per kind of thing (6 / 8 / 10 / 14 / 18 / 22 /
  999), shadows only under the panel and dialog, all ink-tinted and layered. Engineer: no
  `shadow-sm` on anything, no `rounded-lg` by default.
- **The glass panel and scrim.** One translucent surface in the app, `blur(28px)
  saturate(1.35)`, left corners only, page dimmed behind it. Keep it the only glass.
