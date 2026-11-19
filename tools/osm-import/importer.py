"""Create conservative, insert-only Fyndo payloads from an archived OSM district query.
No credentials, Google calls, or live database writes are performed by this module.
"""

import re
import math
import unicodedata
from difflib import SequenceMatcher
from urllib.parse import urlsplit


def make_spot(element):
    tags = element.get('tags', {})
    point = element.get('center', element)
    name = tags.get('name:en') or tags.get('name')
    source = f"https://www.openstreetmap.org/{element['type']}/{element['id']}"
    locality = tags.get('addr:city') or tags.get('addr:suburb') or 'Colombo District (locality unknown)'
    number = re.fullmatch(r'Colombo\s*0?(\d{1,2})', locality, flags=re.I)
    if number:
        locality = 'Colombo ' + str(int(number[1]))
    aliases = {'kollupitiya': 'Colombo 3', 'bambalapitiya': 'Colombo 4',
               'wellawatte': 'Colombo 6', 'thimbirigasyaya': 'Colombo 5',
               'cinnamon gardens': 'Colombo 7', 'colombo fort': 'Colombo 1'}
    locality = aliases.get(locality.lower(), locality)
    website = tags.get('website') or tags.get('contact:website') or ''
    try:
        parsed = urlsplit(website)
        if parsed.scheme not in ('https', 'http') or not parsed.hostname or parsed.username or parsed.password:
            website = ''
    except ValueError:
        website = ''
    hours = tags.get('opening_hours', '')
    return {
        'id': f"osm-{element['type']}-{element['id']}",
        'name': name,
        'area': locality,
        'category': 'Street Food' if tags.get('amenity') == 'fast_food' else 'Restaurant',
        'lat': point.get('lat'), 'lng': point.get('lon'),
        'price_min': 0, 'price_max': 0,
        'open_time': None, 'close_time': None,
        'menu': [], 'menu_updated_at': None,
        'moods': [], 'features': [],
        'about': 'Listed on OpenStreetMap; not independently verified by Fyndo. '
                 'Prices and opening hours are unconfirmed; contact the venue before visiting. '
                 f'© OpenStreetMap contributors (ODbL). Source: {source}' +
                 (f' OSM opening-hours text (unconfirmed): {hours}.' if hours else ''),
        'google_place_id': None,
        'verified': False, 'hidden_gem': False,
        'booking_enabled': False, 'owner_id': None,
        'phone': tags.get('phone') or tags.get('contact:phone') or '',
        'whatsapp': '', 'website': website,
        'video_url': '', 'photos': [], 'photo_info': {},
    }


def prepare(elements, existing):
    """Insert-only plan. Quarantine uncertain records and possible duplicates."""
    def norm(name):
        folded = unicodedata.normalize('NFKD', name.lower())
        return ''.join(c for c in folded if c.isalnum() and not unicodedata.combining(c))
    def valid_coordinates(row):
        return all(isinstance(row.get(k), (int, float)) and not isinstance(row[k], bool)
                   and -bound <= row[k] <= bound and math.isfinite(row[k])
                   for k, bound in (('lat', 90), ('lng', 180)))
    def distance(a, b):
        if not valid_coordinates(a) or not valid_coordinates(b):
            return float('inf')
        lat1, lat2 = math.radians(a['lat']), math.radians(b['lat'])
        dl = lat2-lat1
        dn = math.radians(b['lng']-a['lng'])
        h = math.sin(dl/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(dn/2)**2
        return 6371000 * 2 * math.asin(min(1, math.sqrt(h)))
    rows, skipped = [], []
    known = list(existing)
    ids = {x['id'] for x in known}
    for e in elements:
        tags = e.get('tags', {})
        ref = f"osm-{e['type']}-{e['id']}"
        name = tags.get('name:en') or tags.get('name') or ''
        reason = ''
        if not name.strip():
            reason = 'unnamed'
        elif any(k in tags for k in ('fixme', 'disused', 'abandoned')):
            reason = 'source_needs_review'
        elif tags.get('addr:city', '').strip().lower() in {'panadura', 'kalutara'}:
            reason = 'conflicting_district_address'
        elif name.lower().strip() in {'restaurant', 'hotel', 'shop', 'food', 'cafe', 'fast food'}:
            reason = 'generic_name'
        elif tags.get('amenity') not in {'restaurant', 'fast_food'}:
            reason = 'not_restaurant'
        if reason:
            skipped.append({'id': ref, 'name': name, 'reason': reason})
            continue
        row = make_spot(e)
        if row['lat'] is None or row['lng'] is None:
            skipped.append({'id': ref, 'name': name, 'reason': 'missing_coordinates'})
            continue
        if not valid_coordinates(row):
            skipped.append({'id': ref, 'name': name, 'reason': 'invalid_coordinates'})
            continue
        match = next((x for x in known if x['id'] == ref or
                      (distance(row, x) <= 100 and
                       SequenceMatcher(None, norm(row['name']), norm(x['name'])).ratio() >= 0.72)), None)
        if match:
            skipped.append({'id': ref, 'name': name, 'reason': 'possible_duplicate', 'existing_id': match['id']})
            continue
        rows.append(row)
        known.append(row)
        ids.add(ref)
    return rows, skipped
