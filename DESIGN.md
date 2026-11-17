---
name: Fyndo
description: Find the real spots in Sri Lanka: what a place looks like, what it costs, and the whole night planned in a minute.
colors:
  bg: "#ffffff"
  surface: "#ffffff"
  surface-2: "#f3f3f3"
  surface-3: "#e8e8e8"
  ink: "#000000"
  ink-2: "#3a3a3a"
  muted: "#6b6b6b"
  line: "#ebebeb"
  line-strong: "#d2d2d2"
  primary: "#000000"
  on-primary: "#ffffff"
  accent: "#2747d6"
  accent-soft: "#edf0fd"
  green: "#0b7a43"
  green-soft: "#e8f5ee"
  red: "#c9372b"
  red-soft: "#fdecea"
  dark-bg: "#14181c"
  dark-surface: "#1b2026"
  dark-surface-2: "#232a31"
  dark-surface-3: "#2e3740"
  dark-ink: "#f2f4f6"
  dark-muted: "#93a0ad"
  dark-line: "#262e36"
  dark-primary: "#ffffff"
  dark-accent: "#8fa8ff"
  dark-green: "#45cf8a"
  dark-red: "#ff7a6e"
typography:
  display:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "clamp(2.1rem, 6vw, 3.6rem)"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.4rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "15.5px"
    fontWeight: 600
    lineHeight: 1.25
  button:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  small:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "13px"
  google-attribution:
    fontFamily: "Roboto, Arial, sans-serif"
    fontSize: "13px"
rounded:
  sm: "8px"
  control: "12px"
  poster: "10px"
  card: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "18px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.pill}"
    height: "48px"
  button-secondary:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
  chip:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
  chip-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
  input:
    backgroundColor: "{colors.surface-2}"
    rounded: "{rounded.control}"
  poster:
    rounded: "{rounded.poster}"
    aspectRatio: "4 / 5"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
---

# Design System: Fyndo

## Overview

**Creative North Star: "Night ledger"**

Luxury through restraint, at the craft level of Uber and Letterboxd (the owner's standing reference; never their logos, colours or names). Black and white do the work. One accent, Ceylon sapphire, marks what is yours or chosen: ratings, saves, links, focus, the hover ring on a poster. Places are shown like a poster wall: a clean photo with a hairline edge, the facts set quietly underneath. Many features, few colours: everything is one tap from home through a row of grey shortcut tiles.

**Key characteristics:**
- Big, tight headings ("Where to tonight?") and one large pill search field on home.
- Solid black pill (white in dark mode) for the one main action; grey pills for everything else.
- Grey filled inputs and chips; the selected chip turns solid.
- Place posters at 4:5, rounded 10px, with a sapphire ring on hover or focus.
- Segmented controls: a grey track where the open tab lifts.
- The planned night is a trip: a thin line with numbered black stops.

## Colors

**Restrained strategy.** Neutrals plus one accent; green and red only carry state (open, confirmed, errors, closed).

- **Light:** white ground, `#f3f3f3` fills, black ink, `#6b6b6b` secondary text, sapphire `#2747d6`.
- **Dark:** slate night `#14181c` (not pure black, so photos glow), `#1b2026` cards, `#232a31` fills, `#f2f4f6` ink, sapphire `#8fa8ff`. The primary button inverts to white with black text.
- **Night panels** (plan banner, rewards tier, compare tray) use `--panel`: black in light, raised slate in dark.

**The one-accent rule.** Sapphire never decorates. If it is on screen, it means rated, saved, selected, focused or a link.

## Themes

Light, dark, or follow the phone. The header's round button flips light and dark; Me > Appearance offers all three. The choice lives in this browser (`fyndo-theme`), and an inline script in `app/layout.js` applies it before the first paint. All colours are tokens on `:root`, redefined under `:root[data-theme="dark"]` and under `prefers-color-scheme: dark` for `:root:not([data-theme="light"])`. Components never hard-code colours; use the tokens (`--primary`, `--on-primary`, `--panel`, `--accent`, `--on-green` and so on).

## Typography

**Geist** for everything, so weight and size carry the hierarchy. Roboto 13px only for the "Google Maps" attribution, as Google's display rules require.

- **Display:** 700, clamp(2.1rem, 6vw, 3.6rem), tracking -0.035em.
- **Headline:** 700, 1.4rem, tracking -0.02em. Row labels ("Pick a mood") are 0.95rem, 600, muted.
- **Poster title:** 600, 15.5px. Sub-lines 13px muted.
- **Body:** 400, 16px, 1.55. Numerals are tabular in prices, stats and tables.
- Sentence case everywhere; no all-caps labels, no eyebrows.

## Layout

A 1120px column with 16px gutters. Home: question, search and example chips on the left, a slow photo slideshow on the right; below, six shortcut tiles (Plan a night solid, the rest grey), mood chips, then poster rails and the full poster grid (auto-fill, min 200px; two across on phones). On phones the home stacks as: question, search, shortcuts (3 by 2), moods, open near you, then the photo. Bottom tab bar at 760px and below; the header keeps the logo and theme button.

## Elevation & motion

Flat by default; depth comes from tone (white, grey fills, slate). Shadows only where something floats or lifts: the active segment, the compare tray, the tour card, the share sheet. Motion is short and eased out (`cubic-bezier(0.16, 1, 0.3, 1)`): presses scale to 0.97, posters zoom 4% on hover, the save button pops. Reduced motion turns all of it off.
