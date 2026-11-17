# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Three audiences, weighted equally (confirmed by the owner):
- Young locals in Colombo (students, young professionals, couples) deciding where to eat or go tonight, on a phone, often already out.
- Families and groups planning an occasion (birthday, anniversary, family outing) a few days ahead, comparing prices and booking a table.
- Tourists in Sri Lanka who want real local places, honest prices (LKR with a USD view) and directions, not tourist traps.

Two working roles sit beside them: restaurant owners who claim and manage their page (yearly plan), and the Fyndo admin team.

## Product Purpose
Help people in Sri Lanka find a real place to eat or go, know what it looks like and what it costs before they leave, and plan the whole outing in a minute. Success: someone opens Fyndo undecided and leaves with a place, a price they trust, and directions or a booking.

## Positioning
All four are the point (owner confirmed):
- Real look and real prices: what the place actually looks like and what it costs per person.
- Plans the whole outing: mood, budget and occasion turn into a night (dinner, dessert, sunset).
- Local hidden gems: small verified spots (kottu, short eats, cafés) big apps bury.
- Rewards and booking: stamp cards, points, table booking and owner replies.

## Operating Context
Mobile-first web app (installable PWA) used outdoors and in the evening, on mid-range Android phones and patchy mobile data; desktop for admins and owners. Places are in Colombo 3, 4, 5, 7, Dehiwala and Mount Lavinia today. Prices in LKR with a live USD rate. Maps are OpenStreetMap via Leaflet; directions open Google Maps.

## Capabilities and Constraints
- Next.js static export on Azure Static Web Apps with Azure Functions; Supabase for accounts, data and storage; demo mode without Supabase.
- Features that must all survive any redesign: search and Ask Fyndo (free AI), moods and occasions, filters, list and map views, compare and group vote, date/night planner, place pages (photos, video, menu, Google info, reviews), saves, bookings, QR check-ins and rewards, bill split, reels (Watch), credits, owner claims and Business dashboard, admin (spots, tools, owner claims, lists, reports).
- Everything runs on free tiers; Google Places is optional and quota-limited, so every screen must work without it.
- Photos: owners' and admins' uploads, credited open-licence finds, Google photos live only, labelled example photos otherwise.

## Brand Commitments
- Name "Fyndo" and the map-pin logo mark are kept. Colours, typefaces and style are free to change (owner confirmed).
- Standing look (owner, November 2026): luxury and minimal in the manner of Uber and Letterboxd: monochrome, photo posters, many features one tap away, light and dark modes. Uber and Letterboxd set the craft bar; never copy their logos, colours or names.
- Plain, friendly English; sentence case; no hype.
- Owner contact: fyndolk.official@gmail.com.

## Evidence on Hand
- 177 real places from Google Nearby (supabase/seed_google.sql), 13 sample places in demo mode.
- Openly licensed photos and one video in public/img and public/video, credited on /credits.
- No testimonials, user counts, press or partner logos exist; never invent them.

## Product Principles
1. Show, don't claim: real photos, real prices, honest labels when something is an example.
2. Decide in a minute: the shortest path from "where tonight?" to a place and directions.
3. Works for everyone, anywhere: phones, slow data, outdoors, no account needed to browse.
4. Never a dead end: when a service is down or out of quota, Fyndo's own information still answers.
5. Keep every feature; simplify by splitting into clearer pages, not by removing.

## Accessibility & Inclusion
Readable outdoors and at night (strong contrast in light and dark), 44px touch targets, keyboard and screen reader support, reduced-motion respected. Many users read English as a second language: short, plain words.
