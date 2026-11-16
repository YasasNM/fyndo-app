---
name: Fyndo
description: Find the real spots in Sri Lanka: what a place looks like, what it costs, and the whole night planned in a minute.
colors:
  livery-red: "#b8202b"
  livery-red-deep: "#9a1a23"
  board-black: "#141414"
  route-yellow: "#ffd000"
  route-yellow-edge: "#a88800"
  route-yellow-soft: "#fff3b0"
  board-white: "#f2f2ee"
  enamel-white: "#ffffff"
  board-grey: "#e8e8e2"
  ink: "#141414"
  ink-soft: "#3a3a36"
  muted: "#5f5f58"
  rule: "#d8d8d0"
  rule-strong: "#b9b9b0"
  open-green: "#13804a"
  open-green-soft: "#e4f3ea"
  open-green-edge: "#b9dfc8"
  open-green-text: "#135c37"
  chilli: "#c8381f"
  chilli-soft: "#fbe9e5"
  chilli-edge: "#f1c3b9"
  chilli-text: "#8f2615"
  header-link: "#ffe1e3"
  blind-placeholder: "#d9b400"
  strip-text: "#d6d6cf"
  strip-text-bright: "#e2e2db"
  strip-rule: "#6a6a64"
  placeholder: "#8a8a82"
  star-gold: "#e0a800"
  star-empty: "#cfcfc6"
  rating-text: "#5a4700"
  link-on-dark: "#ff8a8f"
  you-are-here: "#2563eb"
  google-grey: "#5f6368"
  dark-green-soft: "#14301f"
  dark-chilli-edge: "#6b3028"
typography:
  display:
    fontFamily: "Saira Condensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "clamp(2.3rem, 9vw, 3.6rem)"
    fontWeight: 800
    lineHeight: 0.98
    letterSpacing: "0em"
  headline:
    fontFamily: "Saira Condensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "1.55rem"
    fontWeight: 700
    lineHeight: 1.1
  numeral:
    fontFamily: "Saira Condensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 800
    lineHeight: 0.9
    fontFeature: "tnum"
  label:
    fontFamily: "Saira Condensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.1
  title:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "1.06rem"
    fontWeight: 700
    lineHeight: 1.2
  numeral-large:
    fontFamily: "Saira Condensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 800
    lineHeight: 0.9
  blind:
    fontFamily: "Saira Condensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
  button:
    fontFamily: "Saira Condensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.1
  body:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  ui-large:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "15px"
  ui:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "14px"
  small:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "13.5px"
  meta:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 700
  caption:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "11px"
  google-attribution:
    fontFamily: "Roboto, Arial, sans-serif"
    fontSize: "13px"
rounded:
  tag: "4px"
  plate: "5px"
  chip: "6px"
  control: "8px"
  card: "10px"
  round: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "28px"
components:
  button-primary:
    backgroundColor: "{colors.route-yellow}"
    textColor: "{colors.board-black}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 22px 15px"
    height: "48px"
  button-dark:
    backgroundColor: "{colors.board-black}"
    textColor: "{colors.enamel-white}"
    rounded: "{rounded.control}"
  button-ghost:
    backgroundColor: "{colors.enamel-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
  chip:
    backgroundColor: "{colors.enamel-white}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.chip}"
    padding: "7px 12px"
  chip-selected:
    backgroundColor: "{colors.route-yellow}"
    textColor: "{colors.board-black}"
  area-plate:
    backgroundColor: "{colors.route-yellow}"
    textColor: "{colors.board-black}"
    rounded: "{rounded.plate}"
    padding: "4px 9px 3px"
  search-blind:
    backgroundColor: "{colors.board-black}"
    textColor: "{colors.route-yellow}"
    rounded: "{rounded.control}"
    height: "52px"
  header:
    backgroundColor: "{colors.livery-red}"
    textColor: "{colors.enamel-white}"
  card:
    backgroundColor: "{colors.enamel-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
---

# Design System: Fyndo

## Overview

**Creative North Star: "The Galle Road bus board"**

Fyndo borrows the working signage of Colombo's buses: the red livery band, the yellow route board, the black destination blind. Every place reads like a stop on that board: its area on a yellow plate, its per-person price set as the route number. The world lends four things only, type, palette, density and one signature move; the layout, navigation and controls stay the ordinary ones people already know from apps.

The ground is a cool board-white, never cream. Red owns the shell and nothing else. Yellow on black is reserved for the things that orient you or act: area plates, the search blind, the selected plate and the one primary action. Hierarchy comes from scale, not from many sizes: huge condensed numerals for prices and route numbers, small plain labels for everything else.

**Key Characteristics:**
- Red livery band at the top on every screen; the active page is a yellow plate in it (desktop) or a red marker in the bottom bar (phone).
- Yellow area plates with a 2px board-black ring, carrying the open/closed mark in their first cell.
- Prices as route-board numerals in Saira Condensed 800, with "LKR per person" beneath.
- The planner drawn as a route: a red line with numbered yellow stop plates.
- Atkinson Hyperlegible for all reading text: built for low vision, second-language readers and outdoor light.

## Colors

A shell red, a route-board yellow on board black, and quiet neutrals; green and chilli only carry state.

### Primary
- **Livery Red** (#b8202b): the header band, the active tab marker, a saved bookmark, the planner's route line. Never on content cards or text blocks.
- **Route Yellow** (#ffd000) on **Board Black** (#141414): area plates, the search blind's lettering, the selected chip or tab, and the primary button. Its edge (#a88800) is the button's pressed lip.

### Secondary
- **Livery Red Deep** (#9a1a23): links and small icons on light grounds, the header's bottom rule.
- **Route Yellow Soft** (#fff3b0): hover on plates and the chosen option row.

### Neutral
- **Board White** (#f2f2ee): the page ground.
- **Enamel White** (#ffffff): cards, inputs, ghost buttons.
- **Board Grey** (#e8e8e2): quiet fills (tags, steppers, tracks).
- **Ink** (#141414), **Ink Soft** (#3a3a36), **Muted** (#5f5f58): text in three steps.
- **Rule** (#d8d8d0) and **Rule Strong** (#b9b9b0): dividers and control outlines.

### State
- **Open Green** (#13804a): open now, verified, confirmed.
- **Chilli** (#c8381f): closed, errors, destructive actions.

### Named Rules
**The Shell Red Rule.** Red is the bus, not the cargo: it lives in the header band, the active nav marker and the route line, never as a card fill or a text colour for content.
**The Plate Rule.** Yellow appears only where it orients or acts: an area plate, the search blind, a selected plate, the primary button. A screen with yellow decoration has lost its signage.

Dark mode keeps the world: a near-black ground (#0f0f0e) with #1a1a18 surfaces, a deeper livery red (#a31c26), yellow plates unchanged, links in a light red (#ff8a8f) and yellow focus rings.

## Typography

**Display Font:** Saira Condensed (with Arial Narrow, system-ui)
**Body Font:** Atkinson Hyperlegible (with system-ui)
**Google credit:** Roboto 13px, only for the "Google Maps" attribution text, as Google's display rules require.

**Character:** a condensed route-board face for everything you scan (names of pages, plates, prices, buttons) beside a hyperlegible reading face for everything you read.

### Hierarchy
- **Display** (800, clamp(2.3rem, 9vw, 3.6rem), 0.98): page titles like "Find the real spots."
- **Headline** (700, 1.55rem, 1.1): section heads ("Open near you", "Hidden gems").
- **Numeral** (800, 30px on cards, 40px on the place page, 0.9, tabular): per-person prices.
- **Label** (700, 17–18px, 1.1): buttons, chips, tabs, plates.
- **Title** (Atkinson 700, 1.06rem): place names on cards.
- **Body** (Atkinson 400, 16px, 1.55): descriptions and forms; 13–13.5px for secondary lines.

### Named Rules
**The Scale Rule.** Rank by scale contrast: a price or route number is huge, its label is small, and there is no in-between size competing with them.
**The Sentence Case Rule.** Plates, buttons and heads are sentence case; no tracked capitals.

## Layout

A single 1060px column on desktop with 16px side gutters; place cards sit in an auto-fill grid (min 240px) or horizontal rails (230–250px cards on desktop, one 86%-wide card with the next peeking on phones). On phones the home page re-orders so the search blind sits directly under the red band, followed by the mood plates, "Open near you", then the intro and the video. Cards move their price under the name when narrower than 280px (container query). Bottom navigation appears at 760px and below. Spacing steps are 4, 8, 12, 16 and 28px; sections open with 26–30px above their head.

## Elevation & Depth

Flat by default. Depth comes from tone (board-white ground, enamel-white cards, black strips) and thin rules, not shadows. The only lifts are functional: the pressed lip inside solid buttons (an inset bottom shade that thins on press), a soft drop under the floating compare tray and tour card, and a light shadow under round photo buttons so they read over images.

### Named Rules
**The Painted Board Rule.** Surfaces are flat like painted signage; anything that lifts does so because it floats over content or responds to a press.

## Shapes

Small, firm corners like cut metal plates: 5px on area plates, 6px on chips and tabs, 8px on buttons and inputs, 10px on cards. Round only where the object is round: photo overlay buttons and the open/closed dot. Plates carry a 2px board-black ring.

## Components

### Buttons
- **Shape:** route plate (8px).
- **Primary:** route yellow face, board-black label in Saira Condensed 700 (18px), 48px tall, with a 3px darker lip inside the bottom edge.
- **Press / Focus:** the face drops 2px and the lip thins to 1px; focus is a 2.5px board-black outline offset 3px (yellow in dark mode).
- **Dark:** board-black face, white label, black lip. **Ghost:** white face with a 1.5px outline, no lip. **Danger:** chilli label and outline.

### Chips
- **Style:** white mood plates with a 2px board-black ring, Saira Condensed 700 (17px), 40px tall.
- **State:** selected turns route yellow; hover tints route-yellow-soft.

### Cards / Containers
- **Corner Style:** 10px.
- **Background:** enamel white on board white, 1px rule border.
- **Internal Padding:** 11–12px; the photo runs edge to edge at 4:3.

### Inputs / Fields
- **Style:** white, 1.5px rule-strong outline, 8px corners, 44px minimum height.
- **Focus:** board-black border with a 3px route-yellow ring.
- **Error:** chilli text under the field, never only a red border.

### Navigation
- **Header:** the red livery band with the yellow pin wordmark; desktop links in Saira Condensed 18px, the current page a yellow plate.
- **Bottom bar (phones):** white bar, icons over labels; the current page gets a red icon plate and red label.
- **Section tabs:** a board-black strip; the open tab is a yellow plate.

### Place card (signature)
Photo first. The yellow area plate sits top-left and always holds the open (green) or closed (chilli) mark in its first cell; the save bookmark sits top-right. Below the photo: the place name and "category, open till 11 PM" on the left, the per-person price as a route numeral on the right. Marks (verified, hidden gem, bookable, video) follow in one small row; nothing is labelled twice.

### Destination blind (search)
A board-black field with route-yellow lettering, 52px tall. On phones it spans the full width directly under the red band.

### Route strip (planner)
The planned night is a red 4px line with numbered yellow stop plates (30px, ring and Saira 800 numerals) beside each stop.

## Do's and Don'ts

### Do:
- **Do** keep red to the shell: header band, active nav marker, route line, saved state.
- **Do** put area and price on every place surface as a plate and a route numeral.
- **Do** keep the open/closed mark inside the area plate, in the same place on every card.
- **Do** use Atkinson Hyperlegible for anything longer than a label.

### Don't:
- **Don't** use a cream or warm paper ground; the ground is cool board-white (#f2f2ee).
- **Don't** add yellow as decoration; it marks plates, the search blind, selection and the primary action only.
- **Don't** set prices or names in tracked capitals, or add labels above headings.
- **Don't** turn the bus world into a costume: no fake route numbers, ticket stubs or destination-blind animations on working screens.
