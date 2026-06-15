#!/usr/bin/env python3
"""
Update version across all files in the Simple Irrigation integration.
Usage: python3 update_version.py [new_version]
"""
import json
import sys
from pathlib import Path

def get_current_version():
    """Get version from VERSION file."""
    version_file = Path(__file__).parent / "VERSION"
    return version_file.read_text().strip()

def update_version(new_version=None):
    """Update version in all relevant files."""
    if new_version:
        # Update VERSION file
        version_file = Path(__file__).parent / "VERSION"
        version_file.write_text(new_version + "\n")
        version = new_version
    else:
        version = get_current_version()
    
    print(f"Updating to version: {version}")
    
    # Update manifest.json
    manifest_path = Path(__file__).parent / "custom_components" / "simple_irrigation" / "manifest.json"
    with open(manifest_path, 'r') as f:
        manifest = json.load(f)
    manifest["version"] = version
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)
    print(f"Updated {manifest_path}")
    
    # Update frontend package.json
    frontend_package_path = Path(__file__).parent / "custom_components" / "simple_irrigation" / "frontend" / "package.json"
    with open(frontend_package_path, 'r') as f:
        package = json.load(f)
    package["version"] = version
    with open(frontend_package_path, 'w') as f:
        json.dump(package, f, indent=2)
    print(f"Updated {frontend_package_path}")
    
    # Update frontend panel TypeScript file
    panel_path = Path(__file__).parent / "custom_components" / "simple_irrigation" / "frontend" / "src" / "simple-irrigation-panel.ts"
    content = panel_path.read_text()
    
    # Replace the VERSION constant line
    import re
    new_content = re.sub(
        r'// Version is automatically injected from ../../../../VERSION file during build\ndeclare const __VERSION__: string;\nconst VERSION = __VERSION__;',
        f'// Version is automatically injected from ../../../../VERSION file during build\ndeclare const __VERSION__: string;\nconst VERSION = __VERSION__;',
        content
    )
    
    panel_path.write_text(new_content)
    print(f"Updated {panel_path}")
    
    # Update Python version.py file
    version_py_path = Path(__file__).parent / "custom_components" / "simple_irrigation" / "version.py"
    version_py_content = version_py_path.read_text()
    
    # Replace the embedded version
    new_version_py_content = re.sub(
        r'# Version is embedded here and synced by update_version\.py script\n__version__ = "[^"]+"',
        f'# Version is embedded here and synced by update_version.py script\n__version__ = "{version}"',
        version_py_content
    )
    
    version_py_path.write_text(new_version_py_content)
    print(f"Updated {version_py_path}")
    
    # Rebuild frontend to inject new version
    import subprocess
    frontend_path = Path(__file__).parent / "custom_components" / "simple_irrigation" / "frontend"
    try:
        result = subprocess.run(["npm", "run", "build"], cwd=frontend_path, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"Rebuilt frontend with new version")
        else:
            print(f"Warning: Frontend build failed: {result.stderr}")
    except FileNotFoundError:
        print("Warning: npm not found, skipping frontend build")

if __name__ == "__main__":
    new_version = sys.argv[1] if len(sys.argv) > 1 else None
    update_version(new_version)