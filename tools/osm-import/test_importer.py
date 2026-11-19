"""Offline regression fixtures, not production restaurant data."""
import importlib.util
import pathlib
import unittest

PATH = pathlib.Path(__file__).with_name('importer.py')
def module():
    if not PATH.exists():
        return None
    spec = importlib.util.spec_from_file_location('osm_importer', PATH)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

class ImportTests(unittest.TestCase):
    def test_unknown_facts_are_not_fabricated(self):
        mod = module()
        element = {'type': 'node', 'id': 123, 'lat': 6.9, 'lon': 79.9,
                   'tags': {'amenity': 'restaurant', 'name': 'Test fixture'}}
        row = mod.make_spot(element) if mod else None
        self.assertIsInstance(row, dict, 'A source-backed restaurant payload is required')
        self.assertEqual(row['id'], 'osm-node-123')
        self.assertEqual(row['area'], 'Colombo District (locality unknown)')
        self.assertIsNone(row['open_time'])
        self.assertIsNone(row['close_time'])
        self.assertEqual((row['price_min'], row['price_max']), (0, 0))
        self.assertFalse(row['verified'])
        self.assertFalse(row['booking_enabled'])
        self.assertEqual(row['photos'], [])
        self.assertIn('https://www.openstreetmap.org/node/123', row['about'])

    def test_business_tags_keep_real_locality_and_safe_contacts(self):
        mod = module()
        e = {'type': 'way', 'id': 456, 'center': {'lat': 6.8, 'lon': 79.9},
             'tags': {'amenity': 'restaurant', 'name': 'Fixture', 'addr:city': 'Colombo 03',
                      'phone': '+94 111 234567', 'website': 'https://example.com',
                      'opening_hours': 'Mo-Fr 09:00-18:00'}}
        row = mod.make_spot(e)
        self.assertEqual(row['area'], 'Colombo 3')
        self.assertEqual(row['phone'], '+94 111 234567')
        self.assertEqual(row['website'], 'https://example.com')
        self.assertEqual(row['whatsapp'], '')
        self.assertIsNone(row['open_time'], 'Weekday hours cannot be flattened into a daily schedule')
        self.assertIn('Mo-Fr 09:00-18:00', row['about'])

    def test_malformed_website_is_discarded(self):
        mod = module()
        e = {'type': 'node', 'id': 457, 'lat': 6.8, 'lon': 79.9,
             'tags': {'amenity': 'restaurant', 'name': 'Fixture',
                      'website': 'https://[broken'}}
        row = mod.make_spot(e)
        self.assertEqual(row['website'], '')
        self.assertEqual(row['name'], 'Fixture')

    def test_import_is_insert_only_and_keeps_distinct_branches(self):
        mod = module()
        existing = [{'id': 'existing', 'name': 'Fixture Diner', 'lat': 6.9, 'lng': 79.9}]
        def e(id, name, lat=6.9, lon=79.9, extra=None):
            return {'type': 'node', 'id': id, 'lat': lat, 'lon': lon,
                    'tags': {'amenity': 'restaurant', 'name': name, **(extra or {})}}
        rows, skipped = mod.prepare([e(1, 'Fixture Diner'), e(2, 'Fixture Diner', 6.95),
                                    e(3, 'Another Fixture'), e(4, 'Another Fixture'),
                                    e(5, ''), e(6, 'Uncertain Fixture', extra={'fixme': 'closed?'})], existing) if hasattr(mod, 'prepare') else ([], [])
        self.assertEqual([r['id'] for r in rows], ['osm-node-2', 'osm-node-3'])
        self.assertEqual(len(skipped), 4)
        self.assertEqual(existing[0]['id'], 'existing')

    def test_invalid_coordinates_are_quarantined_and_import_continues(self):
        mod = module()
        for key, bound in (('lat', 90), ('lon', 180)):
            for value in (None, '6.9', 'not numeric', True, False, [], {},
                          float('nan'), float('inf'), -float('inf'),
                          bound + 0.01, -bound - 0.01):
                with self.subTest(key=key, value=value):
                    bad = {'type': 'node', 'id': 801, 'lat': 6.9, 'lon': 79.9,
                           'tags': {'amenity': 'restaurant', 'name': 'Fixture'}}
                    bad[key] = value
                    good = {'type': 'node', 'id': 802, 'lat': 6.9, 'lon': 79.9,
                            'tags': {'amenity': 'restaurant', 'name': 'Fixture'}}
                    existing = [{'id': 'existing', 'name': 'Faraway Fixture',
                                 'lat': 0, 'lng': 0}]
                    rows, skipped = mod.prepare([bad, good], existing)
                    self.assertEqual([r['id'] for r in rows], ['osm-node-802'])
                    self.assertEqual(skipped, [{'id': 'osm-node-801', 'name': 'Fixture',
                                               'reason': 'missing_coordinates' if value is None
                                               else 'invalid_coordinates'}])
        for lat, lon in ((90, 180), (-90, -180), (0, 0), (6.9, 79.9)):
            with self.subTest(valid_lat=lat, valid_lon=lon):
                e = {'type': 'way', 'id': 803, 'center': {'lat': lat, 'lon': lon},
                     'tags': {'amenity': 'restaurant', 'name': 'Boundary Fixture'}}
                rows, skipped = mod.prepare([e], [])
                self.assertEqual(skipped, [])
                self.assertEqual((rows[0]['lat'], rows[0]['lng']), (lat, lon))

    def test_invalid_existing_coordinates_do_not_abort_duplicate_checks(self):
        mod = module()
        for key, bound in (('lat', 90), ('lng', 180)):
            for value in ('not numeric', '6.9', None, True, False, [], {},
                          float('nan'), float('inf'), -float('inf'),
                          bound + 0.01, -bound - 0.01):
                with self.subTest(key=key, value=value):
                    invalid = {'id': 'invalid', 'name': 'Fixture', 'lat': 6.9, 'lng': 79.9}
                    invalid[key] = value
                    valid = {'id': 'valid', 'name': 'Fixture', 'lat': 6.9, 'lng': 79.9}
                    e = {'type': 'node', 'id': 804, 'lat': 6.9, 'lon': 79.9,
                         'tags': {'amenity': 'restaurant', 'name': 'Fixture'}}
                    rows, skipped = mod.prepare([e], [invalid])
                    self.assertEqual([r['id'] for r in rows], ['osm-node-804'])
                    self.assertEqual(skipped, [])
                    rows, skipped = mod.prepare([e], [invalid, valid])
                    self.assertEqual(rows, [])
                    self.assertEqual(skipped[0]['existing_id'], 'valid')
                    same_id = dict(invalid, id='osm-node-804')
                    rows, skipped = mod.prepare([e], [same_id])
                    self.assertEqual(rows, [])
                    self.assertEqual(skipped[0]['existing_id'], 'osm-node-804')
        e = {'type': 'node', 'id': 805, 'lat': 6.9, 'lon': 79.9,
             'tags': {'amenity': 'restaurant', 'name': 'Fixture'}}
        rows, skipped = mod.prepare([e], [{'id': 'missing', 'name': 'Fixture'}])
        self.assertEqual([r['id'] for r in rows], ['osm-node-805'])
        self.assertEqual(skipped, [])

    def test_obvious_out_of_district_address_is_quarantined(self):
        mod = module()
        e = {'type': 'node', 'id': 789, 'lat': 6.8, 'lon': 79.9,
             'tags': {'amenity': 'restaurant', 'name': 'Fixture', 'addr:city': 'Panadura'}}
        rows, skipped = mod.prepare([e], [])
        self.assertEqual(rows, [])
        self.assertEqual(skipped[0]['reason'], 'conflicting_district_address')

if __name__ == '__main__':
    unittest.main()
