#!/usr/bin/env python3
"""Validação rápida da lógica de padrões da lista automática."""

import re
import sys


def extract_domain(url: str):
    from urllib.parse import urlparse
    u = urlparse(url)
    if u.scheme not in ("http", "https"):
        return None
    return (u.hostname or "").lower() or None


def url_matches_pattern(url: str, pattern: str) -> bool:
    p = (pattern or "").strip()
    if not p:
        return False
    if "://" in p:
        escaped = re.escape(p).replace(r"\*", ".*")
        return re.match(f"^{escaped}$", url, re.I) is not None
    host = extract_domain(url)
    if not host:
        return False
    rule = p.lower()
    if rule.startswith("*."):
        apex = rule[2:]
        return host == apex or host.endswith("." + apex)
    return host == rule or host.endswith("." + rule)


cases = [
    ("https://intranet.empresa.local/a", "intranet.empresa.local", True),
    ("https://a.empresa.local/x", "*.empresa.local", True),
    ("https://empresa.local/x", "*.empresa.local", True),
    ("https://outro.local/x", "*.empresa.local", False),
    ("https://erp.empresa.local/legado/1", "https://erp.empresa.local/legado/*", True),
    ("https://erp.empresa.local/novo/1", "https://erp.empresa.local/legado/*", False),
    ("chrome://extensions", "intranet.empresa.local", False),
]

failed = 0
for url, pattern, expected in cases:
    got = url_matches_pattern(url, pattern)
    status = "OK" if got == expected else "FAIL"
    if got != expected:
        failed += 1
    print(f"{status}: {url!r} ~ {pattern!r} => {got} (expected {expected})")

sys.exit(1 if failed else 0)
