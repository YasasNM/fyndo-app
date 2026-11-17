"""Quick checks for the pipeline's matching and link rules. Run: python test_pipeline.py"""
import struct

import pipeline as p


class FakePage:
    def __init__(self, url, text):
        self.url, self._text = url, text

    def get_all_text(self, **_):
        return self._text

    def css(self, sel):
        return []


def run():
    # names
    assert p.tokens("The Fab - Mount Lavinia") == ["fab"]
    assert p.name_in("Cafe Kumbuk", "cafekumbuk") == 1.0
    assert p.name_in("Cafe Kumbuk", "Welcome to Café Kumbuk, Colombo") == 1.0
    assert p.name_in("The Gallery Café", "Barefoot") == 0.0
    # image sizes
    png = b"\x89PNG\r\n\x1a\n" + b"\0" * 8 + struct.pack(">II", 800, 600) + b"\0" * 16
    assert p.image_size(png) == (800, 600)
    # private addresses are refused
    assert not p.safe_url("http://127.0.0.1/")
    assert not p.safe_url("http://localhost/")
    assert not p.safe_url("file:///etc/passwd")
    assert not p.safe_url("http://169.254.169.254/latest")

    # link checking: the AI's answer is never trusted on its own
    spot = {"name": "Cafe Kumbuk", "area": "Colombo 7", "category": "Café"}
    p.ai_available = lambda: True
    p.gemini = lambda *a, **k: ('{"website": "https://www.cafekumbuk.com", "facebook": "https://www.facebook.com/cafekumbuk", '
                                '"instagram": "https://www.instagram.com/cafekumbuk/"}')
    p.fetch_page = lambda url, allow_browser=True: (FakePage("https://www.cafekumbuk.com/", "Café Kumbuk: coffee and food"), "ok")
    got = p.find_links(spot)
    assert got == {"website": "https://www.cafekumbuk.com/", "facebook": "https://www.facebook.com/cafekumbuk",
                   "instagram": "https://www.instagram.com/cafekumbuk/"}, got

    # wrong or unsafe answers are dropped
    p.gemini = lambda *a, **k: ('{"website": "https://www.tripadvisor.com/Restaurant-kumbuk", "facebook": "https://www.facebook.com/groups/123", '
                                '"instagram": "https://www.instagram.com/randomfoodblog/"}')
    assert p.find_links(spot) == {}, p.find_links(spot)
    p.gemini = lambda *a, **k: '{"website": "https://some-other-cafe.lk", "facebook": "", "instagram": ""}'
    p.fetch_page = lambda url, allow_browser=True: (FakePage("https://some-other-cafe.lk/", "Another cafe entirely"), "ok")
    assert p.find_links(spot) == {}
    p.gemini = lambda *a, **k: "Sorry, I could not find it."
    assert p.find_links(spot) == {}
    print("pipeline checks passed")


if __name__ == "__main__":
    run()
