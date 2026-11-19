# Colombo District restaurant import

This directory contains a source-backed, insert-only import prepared from OpenStreetMap. It does not contain credentials and `importer.py` performs no database writes.

## Scope and source

- Administrative boundary: OpenStreetMap relation **5351774**, Colombo District, Sri Lanka (Nominatim result: ISO3166-2 `LK-11`).
- Query: `rel(5351774);map_to_area->.district;nwr(area.district)["amenity"~"^(restaurant|fast_food)$"];out center tags;`
- Retrieved on 19 November 2026 through `https://overpass-api.de/api/interpreter`.
- Source snapshot: `data/osm-restaurants.json` (920 records).
- Prepared new places: `data/prepared-spots.json` (775 records).
- Quarantine and possible duplicates: `data/skipped-spots.json` (145 records).
- Existing places are not replaced or deleted. IDs are deterministic `osm-<type>-<id>`.

This is **available OSM coverage**, not a complete census of every restaurant or a confirmation that businesses are still operating. Restaurants and fast-food venues are included; standalone cafés, bakeries and shops are not part of this query. Records remain unverified and bookings remain disabled until an owner/admin sets them up.

## Data honesty

- Unknown prices are `0/0` (Fyndo's unknown-price sentinel), not invented prices.
- Unknown hours are explicitly null, avoiding the table's fabricated default hours.
- OSM opening-hours text is retained in the description for review, never flattened into a misleading daily schedule.
- Locality comes from address tags, with a small set of canonical Colombo name aliases. Missing locality is explicitly `Colombo District (locality unknown)`.
- Records flagged for review, unnamed/generic records, possible nearby-name duplicates and contradictory Panadura address tags are quarantined.
- Possible duplicates use coordinates (100 m maximum) and name similarity (0.72 minimum), not a names-only merge. This is conservative quarantine, not proof of identity; review skipped records separately.

## License and attribution

© OpenStreetMap contributors. Data is available under the Open Database License (ODbL) 1.0: https://opendatacommons.org/licenses/odbl/1-0/

Source identifiers and links appear in each imported record. Source/processed snapshots are supplied here so the imported database contribution can be inspected and distributed under its applicable license. See https://www.openstreetmap.org/copyright and the OSM attribution guidelines before reusing/distributing derivative databases. OSM licensing does **not** license photographs linked from OSM.

## Accepted historical photos

- **Pagoda Tea Room**, OSM node 4527676077: Commons file `Pagoda Tearooms, Colombo.jpg`, creator Dan arndt, CC BY-SA 4.0, photographed 2016. Matching evidence: file description identifies the venue and Chatham Street/De Mel Building, matching the OSM location; independent location reference places Pagoda Tea Room at the same coordinates. The visible Green Cabin sign alone was not used to identify it.
- **Paradise Road Gallery Cafe**, existing spot `paradise-road-gallery-cafe`: Commons file `The Gallery entrance.jpg`, creator Andrés Moreno, CC BY-SA 2.0, photographed 2009. Matching evidence: visible Gallery Cafe/Bar signs, Colombo restaurant and Geoffrey Bawa Commons categories, and the documented former Bawa office/courtyard context.

Each was resized to a maximum of 1200 px and JPEG recompressed, uploaded to Fyndo's `spot-photos` bucket, and verified through the public storage URL. URL-keyed `photo_info` retains creator, file-description link, license/link, original URL and modifications. These are historical images, not a claim about current appearance. All other imported venues have no accepted venue image and use labelled examples until authorized photos are added.

No Google photos, reviews or ratings were imported. No third-party directory/social-media images were scraped or republished.

## Tests and reproduction

From the project root:

```bash
python3 tools/osm-import/test_importer.py
node --test tests/*.test.mjs
npm run build
```

To regenerate the conservative plan, load `importer.py` and call `prepare(source['elements'], existing_spots)`. `existing_spots` must be a fresh, paginated read of the exact live database; do not replay this snapshot as an upsert. Review quarantined records and attach only licensed/permitted exact-venue photos.

Live writes use authenticated admin permissions and explicit insert-only payloads, followed by read-back verification of every inserted ID and field. The snapshot is not a replacement for live data and should not overwrite owner edits.
