#!/usr/bin/env python3
"""
Update the version across all files of the Simple Irrigation integration.

Usage: python3 update_version.py [new_version]

The VERSION file in the project root is the source of truth. Synced targets:
manifest.json, frontend/package.json, version.py; the frontend bundle embeds
the version at build time (rollup replaces __VERSION__ from the VERSION file).
"""
import json
import re
import subprocess
import sys
from pathlib import Path

DOMAIN = "simple_irrigation"

ROOT = Path(__file__).parent
COMPONENT = ROOT / "custom_components" / DOMAIN


def get_current_version() -> str:
    """Get version from VERSION file."""
    return (ROOT / "VERSION").read_text().strip()


def _update_json(path: Path, version: str) -> None:
    data = json.loads(path.read_text())
    data["version"] = version
    path.write_text(json.dumps(data, indent=2) + "\n")
    print(f"Updated {path}")


def update_version(new_version: str | None = None) -> None:
    """Update version in all relevant files."""
    if new_version:
        (ROOT / "VERSION").write_text(new_version + "\n")
        version = new_version
    else:
        version = get_current_version()

    print(f"Updating to version: {version}")

    _update_json(COMPONENT / "manifest.json", version)
    _update_json(COMPONENT / "frontend" / "package.json", version)

    version_py = COMPONENT / "version.py"
    content = version_py.read_text()
    new_content = re.sub(r'__version__ = "[^"]+"', f'__version__ = "{version}"', content)
    version_py.write_text(new_content)
    print(f"Updated {version_py}")

    # Rebuild frontend so the bundle embeds the new version
    frontend = COMPONENT / "frontend"
    try:
        result = subprocess.run(
            ["npm", "run", "build"], cwd=frontend, capture_output=True, text=True
        )
        if result.returncode == 0:
            print("Rebuilt frontend with new version")
        else:
            print(f"Warning: Frontend build failed: {result.stderr}")
    except FileNotFoundError:
        print("Warning: npm not found, skipping frontend build")


if __name__ == "__main__":
    update_version(sys.argv[1] if len(sys.argv) > 1 else None)
