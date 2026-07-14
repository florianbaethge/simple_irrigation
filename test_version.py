#!/usr/bin/env python3
"""Check that all version sources are consistent with the VERSION file."""
import json
import re
import sys
from pathlib import Path

DOMAIN = "simple_irrigation"

ROOT = Path(__file__).parent
COMPONENT = ROOT / "custom_components" / DOMAIN


def test_version_consistency() -> bool:
    """Compare VERSION file against version.py, manifest.json, package.json."""
    canonical = (ROOT / "VERSION").read_text().strip()
    print(f"Canonical version (VERSION file): {canonical}")

    sources = {}

    match = re.search(r'__version__ = "([^"]+)"', (COMPONENT / "version.py").read_text())
    sources["version.py"] = match.group(1) if match else "<missing>"

    sources["manifest.json"] = json.loads(
        (COMPONENT / "manifest.json").read_text()
    ).get("version", "<missing>")

    sources["frontend/package.json"] = json.loads(
        (COMPONENT / "frontend" / "package.json").read_text()
    ).get("version", "<missing>")

    ok = True
    for name, value in sources.items():
        state = "OK" if value == canonical else "MISMATCH"
        if value != canonical:
            ok = False
        print(f"  {name}: {value} [{state}]")

    print("All versions consistent." if ok else "Version mismatch found.")
    return ok


if __name__ == "__main__":
    sys.exit(0 if test_version_consistency() else 1)
