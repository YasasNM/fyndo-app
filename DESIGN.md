---
name: Fyndo
description: Find the real spots in Sri Lanka: what a place looks like, what it costs, and the whole night planned in a minute.
colors:
  bg: "#ffffff"
  surface: "#ffffff"
  surface-2: "#f1f4f2"
  surface-3: "#e4eae6"
  ink: "#0b1a14"
  ink-2: "#33433c"
  muted: "#5c6b64"
  line: "#e6ebe8"
  line-strong: "#cdd6d1"
  primary: "#0f3b2c"
  on-primary: "#ffffff"
  accent: "#0d6e4f"
  accent-soft: "#e5f3ec"
  star: "#a67c1a"
  green: "#0e8048"
  red: "#c9372b"
  dark-bg: "#0f1513"
  dark-surface: "#161e1b"
  dark-surface-2: "#1e2823"
  dark-surface-3: "#28342e"
  dark-ink: "#eef4f0"
  dark-muted: "#8fa198"
  dark-line: "#222d28"
  dark-primary: "#9fdcc0"
  dark-on-primary: "#06281c"
  dark-accent: "#6fd6a8"
  dark-star: "#e3b94d"
  dark-green: "#4fd08f"
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

**Creative North Star: "Emerald night"**

Luxury through restraint, at the craft level of Uber and Letterboxd (the owner's standing reference; never their logos, colours or names), set in Ceylon emerald. Deep emerald is the one solid action; in dark mode it becomes pale jade on a forest-black ground. A brighter emerald marks what is yours or chosen: links, saves, focus, the hover ring on a poster. Gold is kept only for ratings. Places are shown like a poster wall. Many features, each with one home: Home, Plan, Friends, Saved and Profile in the bars; Watch, Rewards and Split a bill as Home tiles; account, bookings and appearance behind Settings on your profile.

**Key characteristics:**
- Big, tight headings ("Where to tonight?") and one large pill search field on home.
- Solid emerald pill for the one main action; grey-green pills for everything else.
- Fine-line duotone icons (1.5px line over a 20% fill of the same colour) on soft emerald medallions with a hairline ring.
- Place posters at 4:5, rounded 10px, with an emerald ring on hover or focus.
- Segmented controls: a soft track where the open tab lifts. The active bottom tab sits in a jade pill.
- The planned night is a trip: a thin line with numbered emerald stops.

## Colors

**Restrained strategy, one hue.** Neutrals carry a breath of green; emerald does action and selection; gold only rates; green and red carry state.

- **Light:** white ground, `#f1f4f2` fills, green-black ink `#0b1a14`, deep emerald `#0f3b2c` actions, emerald `#0d6e4f` links and selection, gold `#a67c1a` stars.
- **Dark:** forest night `#0f1513`, `#161e1b` cards, `#1e2823` fills, `#eef4f0` ink, pale jade `#9fdcc0` actions with `#06281c` text, `#6fd6a8` links, gold `#e3b94d` stars.
- **Panels** (plan banner, rewards tier, compare tray) use `--panel`: deep emerald in light, raised forest in dark.
- All pairs checked for contrast: body text at least 4.5:1, icons and controls at least 3:1, in both themes.

**The one-hue rule.** Emerald never decorates. If it is on screen, it is an action, something you chose, a link or focus.

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

Flat by default; depth comes from tone. Shadows only where something floats or lifts. Motion is eased out (`cubic-bezier(0.16, 1, 0.3, 1)`) and every animation explains something:
- **Theme switch:** the new theme grows as a circle out of the tapped button (View Transitions; instant where unsupported).
- **Home, first visit of a session:** the heading rises out of its line, the photo opens like a curtain, the tools follow. Returning home is instant.
- **Posters** land as a row with a short stagger over the first eight.
- **Pages** fade in on navigation (opacity only, so fixed trays keep their place). Presses scale to 0.97, the active tab pill grows in, the save button pops.
- Reduced motion turns all movement off.
