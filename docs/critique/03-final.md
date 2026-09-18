# Critique 03: final review

This review covers the live app on `localhost:5234`, driven with Playwright and state seeded in
`localStorage["hourly.v2"]`. Captures are the `docs/critique/shots/f-*` files; contact sheets
are `f-sheet-hours`, `-mobile`, `-sizes`, `-panels`, `-dials`, `-skies`, `-handoff`, and
`-details`.

Coverage:

- Light at 07:10, 10:14, 12:07, 14:30, 16:40, and 18:30; dark at 19:42, 23:15, and 03:00.
- Widths 360, 390, 1024, 1440, and 1920.
- Both panels (desktop and 390), the dialog, the empty state, every dial at 14:30 and 03:00,
  and every sky at 12:07, 14:30, and 21:10.
- The 10:59→11:00 handoff for all five dials.
- Keyboard, reduced motion, unlock, and clean day.

The console showed 0 errors and 0 warnings.

## Status of the 02 findings

| # | Finding | Status | Evidence |
| - | ------- | ------ | -------- |
| B1 | Phones pan sideways | **Fixed** | `scrollWidth` equals the viewport at 360, 390, 1024, and 1920. `scrollTo(80, 0)` lands at `scrollX` 0. |
| M1 | Light paper drifts cream or green | **Fixed** | Every sample outside the hero, at every light hour, stays at OKLCH h 255–263, C .012–.018. At noon the face is neutral (`#EEEFEF`, C .001). |
| M2 | Afternoon fills go olive | **Fixed** | Lit wedge: 12:07 `#A06800` h72, 14:30 `#996B00` h79, 16:40 `#A46400` h67, all 4.0–4.1:1 against the page. Tide at noon is a clean teal. |
| M3 | Night wedge lost in its ring | **Fixed** | Against the ring: 03:00 `#9BA0FF` 5.69:1, 23:15 5.02:1, 19:42 3.50:1. |
| M4 | Minute tip lands in the numerals | **Fixed** | Length 146. The tip ends on the minute track in every capture. |
| m1 | 1920 hole | **Fixed** | The hero hugs the centre gutter (`f-app-1014-1920`). |
| m2 | Toast shifts the log | **Fixed** | First row stays at y 219.0 before, during, and after. The toast takes the count's slot. |
| m3 | "+1" blink | **Fixed** | Opacity is at least .69 from about 160ms to 750ms, centred on the box (x 784 = box centre). |
| m4 | Focus squares the controls | **Fixed** | Checkbox stays 6px and rail button 10px on focus (`f-focus-check-3x`). |
| m5 | Dial handoff cuts | **Fixed** | At +0ms all five dials show the old and new marks crossfading (`f-sheet-handoff`). |
| m6 | Orbit faint, Lantern split | **Fixed** | Orbit's dots and ring read in both themes. Lantern in dark is one disc. |
| n1 | Rules overhang | **Fixed** | Rule 773–1248 = header 128–1248 and well 773–1248. |
| n2 | ≤1180 row padding ignored | **Fixed** | 64px applied (titles are 228px wide at 390). |
| n3 | Sky tick touches text | **Fixed** | Clear of the description (`f-sheet-details`). |
| n4 | 15 tab stops in Settings | **Fixed** | One stop per group, and the arrow keys move and select (Auto → Light switched the theme). |
| n5 | Stepper ignores 12h | **Fixed** | Shows "6 am" / "7 pm". |
| n6 | Lumen badge idiom | **Fixed** | A count plus a lit dot, quiet (`f-rail-lumens-2x`). |

Text contrast re-measured beside the glyphs: pewter meta is 5.6–5.7:1 in light and
6.5–6.6:1 in dark; slate personality line is 5.0 in light and 7.2–7.8 in dark. Unlocking Rays
moved the count from 17 to 9 in the rail and the panel sentence. Reduced motion still stops the
aurora and forces tick.

## The 390px "Remove" trade-off

The trade-off is right at 761–1180px with a mouse. There, "Remove" appears only on hover, the
meta has already moved under the title, and the 64px reserve prevents overlap.

It is wrong on touch and at ≤760px (minor, design + engineer). At 390, every row shows a
permanent "Remove", five stacked in a column (`f-sheet-mobile`). That is repeated chrome in a
log that is otherwise quiet. The reserve cuts titles to 228px, so ordinary titles such as
"Walk the long way to the station" wrap. Removal is also one tap with no undo, placed next to
the title a thumb is aiming at.

**Fix:** On `(hover: none)`, drop the persistent button and the 64px reserve, so titles use the
full row. Tapping a row's title selects the row: it gets the `--hour-wash` fill, and "Remove"
replaces the meta at the right. Tapping elsewhere deselects. After removal, reuse the toast slot
in the log head for "Removed. Undo" (`--hour-ink`, 5s), with the same no-shift crossfade as the
clean-day toast.

This does not block shipping.

## New findings

**None blocking, and nothing reads as generic.** Across the day the app now reads as one
system: one cool paper, and the hour arriving through the lit wedge, halo, second hand, checks,
discs, rail dot, and underline. No finding is manufactured here. One decision needs the lead's
sign-off:

- **Light-mode aurora no longer carries the hour (note, lead).** The brief's concept says the
  aurora "across the page background is tinted by" the hour. In light, the director made all
  three blobs fixed blue-grey, so the hour now reaches the page only through the halo around
  the clock (pink at 07:10, gold at noon; see `f-sheet-hours`). Dark keeps the full aurora. It
  looks better than the version the brief literally describes, and it solves M1. If the lead
  wants the brief kept literally, return `.aurora-a` alone to `var(--hour)` at
  `--aurora-alpha` .10 and re-run the M1 acceptance samples. Otherwise record the change in
  DESIGN.md as intended.

## Sign-off

**Ship it.** No blockers remain. Every 02 finding is fixed in the running app. The touch
"Remove" pattern and the light-aurora note can go in the next pass.
