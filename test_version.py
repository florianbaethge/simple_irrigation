#!/usr/bin/env python3
"""Test that version system works correctly."""
import sys
from pathlib import Path

def test_version_consistency():
    """Test that all version sources are consistent."""
    project_root = Path(__file__).parent
    
    # Read VERSION file
    version_file = project_root / "VERSION"
    canonical_version = version_file.read_text().strip()
    print(f"Canonical version (VERSION file): {canonical_version}")
    
    # Read version.py
    sys.path.insert(0, str(project_root / "custom_components" / "simple_irrigation"))
    try:
        from version import __version__ as py_version
        print(f"Python version (version.py): {py_version}")
        
        if canonical_version == py_version:
            print("✅ Versions are consistent!")
            return True
        else:
            print(f"❌ Version mismatch: {canonical_version} != {py_version}")
            return False
    except ImportError as e:
        print(f"❌ Failed to import Python version: {e}")
        return False

if __name__ == "__main__":
    success = test_version_consistency()
    sys.exit(0 if success else 1)