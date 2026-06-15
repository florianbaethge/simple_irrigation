#!/usr/bin/env python3
"""Update manifest.json version from VERSION file."""
import json
from pathlib import Path

def main():
    """Update manifest version."""
    project_root = Path(__file__).parent.parent
    version_file = project_root / "VERSION"
    manifest_file = project_root / "custom_components" / "simple_irrigation" / "manifest.json"
    
    version = version_file.read_text().strip()
    
    with open(manifest_file, 'r') as f:
        manifest = json.load(f)
    
    manifest["version"] = version
    
    with open(manifest_file, 'w') as f:
        json.dump(manifest, f, indent=2)
        f.write('\n')  # Add trailing newline
    
    print(f"Updated manifest.json version to {version}")

if __name__ == "__main__":
    main()