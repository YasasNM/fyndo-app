---
name: Fyndo
description: Find the real spots in Sri Lanka: what a place looks like, what it costs, and the whole night planned in a minute.
colors:
  bg: "#ffffff"
  surface-2: "#f2f3f2"
  surface-3: "#e6e8e7"
  ink: "#0a0a0a"
  muted: "#626864"
  line: "#e6e8e7"
  lacquer-from: "#060807"
  lacquer-mid: "#0a1712"
  lacquer-to: "#0f3b2c"
  accent: "#0d6e4f"
  star: "#a67c1a"
  gem-emerald: "#0f7a57"
  gem-sapphire: "#2350c8"
  gem-ruby: "#b4233f"
  gem-topaz: "#b8790b"
  gem-amethyst: "#6a3fb5"
  gem-moonstone: "#4f6f88"
  dark-bg: "#090b0a"
  dark-surface: "#101312"
  dark-surface-2: "#161a18"
  dark-ink: "#eef1ef"
  dark-muted: "#8d9893"
  dark-accent: "#6fd6a8"
  dark-star: "#e3b94d"
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

**Creative North Star: "Black lacquer"**

Luxury through restraint, at the craft level of Uber and Letterboxd (the owner's standing reference; never their logos, colours or names). Black and white do the work. A black-to-emerald lacquer gradient (`135deg, #060807 → #0a1712 → #0f3b2c`, a hairline of light on top) marks the main action, the page you are on, planned stops and the few dark panels. Each feature has its own colour from Sri Lanka's gemstones, used on icons only. Gold is kept for ratings.

**Key characteristics:**
- Icons are Phosphor (MIT), embedded in `components/phosphor.js`: regular weight in grey for everyday UI, solid weight for active and tiled icons.
- Gem tiles: a white solid icon on a small rounded square of the feature's gem colour, like iPhone Settings (home tools, settings list).
- Gem map: Home ink, Plan emerald, Friends sapphire, Saved ruby (also Watch), Profile amethyst, Rewards and Business topaz, Split a bill sapphire, Admin and Check in moonstone.
- The active tab fills in its gem colour with a small dot beneath; other tabs stay grey.
- Saved places turn ruby. Selected chips, days and time slots are solid black (white in dark mode).

## Colors

- **Light:** white ground, `#f2f3f2` fills, `#0a0a0a` ink, `#626864` secondary text, emerald `#0d6e4f` links.
- **Dark:** near-black `#090b0a`, `#101312` cards, `#161a18` fills, `#eef1ef` ink. The lacquer gets a thin emerald edge so it reads on black. Gem icons use lighter tones in dark mode; tiles keep the deep tones.
- Contrast is checked for text (4.5:1) and controls (3:1) in both themes.

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

Flat by default; depth comes from tone. Motion is slow, eased (`cubic-bezier(0.16, 1, 0.3, 1)`, springs for small confirmations) and always tied to something you did or something arriving:
- **Theme switch:** the new theme grows as a circle out of the tapped button (View Transitions).
- **Home, first visit of a session:** each word of the headline rises through its own line and comes into focus; the photo opens like a curtain; the tools follow.
- **Place photos develop** from soft and grey to sharp full colour, one after another.
- **Main buttons** catch a band of light (sheen) on hover.
- **Tabs** spring their icon in and a dot appears beneath; **saving** turns the bookmark ruby with a ring that opens and fades.
- **Pages** fade in on navigation. Reduced motion turns all movement off.
