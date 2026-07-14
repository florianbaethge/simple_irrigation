.PHONY: version update-version build install test-version

# Get current version
version:
	@cat VERSION

# Update version everywhere (usage: make update-version VERSION=1.0.0)
update-version:
ifdef VERSION
	@echo "$(VERSION)" > VERSION
	@python3 update_version.py
	@python3 test_version.py
	@echo "Updated all files to version $(VERSION)"
	@echo "Frontend has been rebuilt automatically"
else
	@echo "Usage: make update-version VERSION=1.0.0"
	@exit 1
endif

# Test version consistency
test-version:
	@python3 test_version.py

# Build frontend
build:
	cd custom_components/simple_irrigation/frontend && npm run build

# Install frontend dependencies
install:
	cd custom_components/simple_irrigation/frontend && npm install
