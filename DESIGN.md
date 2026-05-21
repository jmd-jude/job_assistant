---
version: alpha
name: Lanterne Rouge
description: Marketing audit tool brand and UI system
colors:
  ink: "#1a1a1a"
  red: "#C8313A"
  parchment: "#f5f1ec"
  stone: "#8a7d6e"
  asphalt: "#2d2d2d"
  amber: "#B87333"
  green: "#4A7A5A"
  white: "#ffffff"
  border: "rgba(26,26,26,0.10)"
  border-med: "rgba(26,26,26,0.18)"
typography:
  display:
    fontFamily: Georgia, 'Times New Roman', serif
    fontSize: clamp(2.4rem, 4.5vw, 3.8rem)
    lineHeight: 1.1
  h2:
    fontFamily: Georgia, 'Times New Roman', serif
    fontSize: 1.5rem
  body:
    fontFamily: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
    fontSize: 1rem
    lineHeight: 1.6
  body-sm:
    fontFamily: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
    fontSize: 0.875rem
  label-caps:
    fontFamily: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
    fontSize: 0.6875rem
    fontWeight: 700
    letterSpacing: 0.06em
  mono:
    fontFamily: ui-monospace, SFMono-Regular, Menlo, monospace
    fontSize: 0.6875rem
rounded:
  sm: 4px
  md: 8px
  lg: 8px
  xl: 12px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.parchment}"
    rounded: "{rounded.lg}"
    padding: 14px 28px
    typography: "{typography.body-sm}"
  button-primary-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.parchment}"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: 14px 16px
    typography: "{typography.body-sm}"
  card:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.xl}"
  card-inner:
    backgroundColor: "{colors.parchment}"
    rounded: "{rounded.lg}"
    padding: 12px 14px
  badge:
    backgroundColor: "{colors.parchment}"
    textColor: "{colors.stone}"
    rounded: "{rounded.sm}"
    padding: 4px 10px
  badge-red:
    backgroundColor: "rgba(200,49,58,0.08)"
    textColor: "{colors.red}"
    rounded: "{rounded.sm}"
    padding: 2px 6px
  progress-track:
    backgroundColor: "{colors.parchment}"
    rounded: "{rounded.full}"
  progress-fill:
    backgroundColor: "{colors.red}"
    rounded: "{rounded.full}"
---

## Overview

Journalistic precision meets premium print. The UI evokes a high-end broadsheet or analyst report — the kind of document a serious operator would take seriously. The palette is warm (parchment, not white), the type mixes editorial serif for display moments with clean system sans for body, and the accent is a single brand red that does all the work.

The brand takes its name from the *lanterne rouge* — the last-place finisher's jersey in the Tour de France, a position of unexpected honor. The glyph is a bullseye: outer ring and inner dot in Lanterne Red. It holds at favicon scale without losing its read.

## Colors

The palette is built around high-contrast ink-on-parchment with a single active color.

- **Ink (#1a1a1a):** Near-black for all primary text and the default button background.
- **Red (#C8313A):** Lanterne Rouge brand red. Used exclusively for interaction — links, active states, progress fills, the spinner, and the glyph. One color does all the accent work; don't introduce a second.
- **Parchment (#f5f1ec):** Page background and card interior fill. Warmer than white — it reads as premium without reading as dark mode.
- **Stone (#8a7d6e):** Secondary text: captions, labels, metadata, placeholder copy. Also the wordmark subtitle ("ROUGE") color.
- **Asphalt (#2d2d2d):** Slightly elevated from ink; available but used sparingly.
- **Amber (#B87333):** Score display color when a score is middling — warning register without alarm.
- **Green (#4A7A5A):** Positive states and strong scores.
- **White (#ffffff):** Card surfaces (the layered card sits on parchment, so white reads as elevated).
- **Border / Border-med:** Ink at 10% and 18% opacity respectively. Used as `0.5px` hairlines throughout — this sub-pixel weight is intentional and central to the refined feel.

## Typography

Two stacks: serif for display and brand moments, system sans for everything else.

Georgia is used only for headlines, the wordmark, and score numerals — contexts where editorial weight is appropriate. Running body text, labels, and UI copy use the system stack for legibility and neutrality.

The `label-caps` style (11px, bold, tracked, uppercase) is the workhorse label style for section titles, data source tags, and section headers. It creates hierarchy without adding a third typeface.

## Layout

Max content width is `max-w-5xl` (80rem). Pages are single-column on mobile, with occasional two- or three-column grids at `lg:` breakpoints for feature callouts.

The report page uses a sidebar/main split. Agent deep-dives are tabbed, not stacked, to keep the page height manageable.

Borders throughout are `0.5px` — thinner than the browser default `1px`. This is load-bearing to the aesthetic; 1px borders read as generic.

## Elevation & Depth

Depth is achieved through background color, not shadow. The layering order is:

1. Parchment — page background
2. White — primary card surface
3. Parchment — inner card elements (nested within white cards)

No `box-shadow` is used. Elevation is purely colorimetric.

## Components

**Button (primary):** Ink background, parchment text, `rounded-lg`, hover at `opacity-80`. The disabled state drops to `opacity-40`. No border.

**Input:** White background, `0.5px` border at `--lr-border-med` default, `--lr-red/40` on focus with a `ring-2` at `--lr-red/15`. The ring is subtle — just enough to confirm focus without screaming.

**Card:** White background, `rounded-xl`, `0.5px` border at `--lr-border-med`. Interior sections use parchment with `0.5px` dividers at `--lr-border`.

**Badge / Tag:** Parchment background, stone text, `rounded-sm` (4px). Red-tinted variant for severity labels (high/medium/low impact).

**Progress bar:** Parchment track, red fill, both `rounded-full`. Height is `5px` for dimension scores, `4px` for the run progress bar.

**Score display:** Uses the serif typeface at large size (`text-3xl`+), colored amber or green based on score range. Always in a parchment-background pill or card.

## Do's and Don'ts

Use `0.5px` borders, not `1px`. The refined weight is visible in the design; `1px` collapses the aesthetic.

Use the red for one thing at a time on any given surface — interaction state or brand accent, not both simultaneously.

The serif typeface is reserved for headlines, the wordmark, and score numerals. Do not use Georgia for body copy or labels.

Labels and category names are always uppercase with wide tracking (`label-caps` style). Running prose is never uppercased.

The parchment background is always warm (`#f5f1ec`). Do not substitute with `#f5f5f5` or any cool-toned gray — the warmth is the point.