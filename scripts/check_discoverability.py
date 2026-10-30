#!/usr/bin/env python3
"""Check that public research pages are readable, internally linked and listed in sitemap.

Local static checks only. These do NOT prove live GitHub Pages serving or Google indexing.
"""
from __future__ import annotations

import json
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, unquote

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://sunilgargusai.github.io/sunilgar-portfolio/"
TARGETS = ["index.html", "research/vertex-eccentricity-labeled-energy.html",
           "research/vele-power-grid-screening.html"]


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta = {}
        self.canonical = []
        self.links = []
        self.h1 = 0
        self.in_title = False
        self.title = ""
        self.in_ld = False
        self.ld_text = ""
        self.ld = []

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if tag == "meta" and d.get("name"):
            self.meta[d["name"].lower()] = d.get("content", "")
        if tag == "link" and d.get("rel") == "canonical":
            self.canonical.append(d.get("href", ""))
        if tag == "a":
            self.links.append(d.get("href", ""))
        if tag == "h1":
            self.h1 += 1
        if tag == "title":
            self.in_title = True
        if tag == "script" and d.get("type") == "application/ld+json":
            self.in_ld = True
            self.ld_text = ""

    def handle_data(self, data):
        if self.in_title:
            self.title += data
        if self.in_ld:
            self.ld_text += data

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
        if tag == "script" and self.in_ld:
            self.ld.append(json.loads(self.ld_text))
            self.in_ld = False


def main():
    failures = []
    listed = {BASE + path.removesuffix("index.html") for path in TARGETS}
    ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    tree = ET.parse(ROOT / "sitemap.xml")
    seen = {el.text for el in tree.findall(".//s:loc", ns)}
    if seen != listed:
        failures.append("Sitemap URL mismatch. Missing: %s Extra: %s" % (listed - seen, seen - listed))

    for path in TARGETS:
        f = ROOT / path
        if not f.is_file():
            failures.append("Missing page: " + path)
            continue
        p = PageParser()
        try:
            p.feed(f.read_text(encoding="utf-8"))
        except (ValueError, json.JSONDecodeError) as e:
            failures.append(path + ": invalid HTML/JSON-LD: " + str(e))
            continue
        expected = BASE + path.removesuffix("index.html")
        if len(p.canonical) != 1 or p.canonical[0] != expected:
            failures.append(path + ": canonical mismatch")
        if not p.title.strip() or len(p.meta.get("description", "")) < 70:
            failures.append(path + ": missing informative title or description")
        if p.h1 != 1:
            failures.append(path + ": expected exactly one H1")
        if not p.ld:
            failures.append(path + ": missing parseable structured data")
        for link in p.links:
            if not link or link.startswith(("#", "mailto:", "tel:")):
                continue
            parsed = urlparse(link)
            if parsed.scheme or parsed.netloc:
                continue
            if not parsed.path or not parsed.path.endswith(".html"):
                continue
            dest = (f.parent / unquote(parsed.path)).resolve()
            if not dest.is_relative_to(ROOT.resolve()) or not dest.is_file():
                failures.append(path + ": missing local HTML target " + link)
    if failures:
        print("\n".join("FAIL: " + f for f in failures))
        return 1
    print(f"PASS: {len(TARGETS)} HTML pages, JSON-LD, canonical metadata, sitemap, and local HTML links.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
