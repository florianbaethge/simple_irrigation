#!/usr/bin/env bash
# Same Docker image as CI: https://github.com/home-assistant/actions/tree/master/hassfest
# Archives the Git index (staged files) so frontend/node_modules is never scanned — matching a
# clean checkout and what your next commit would contain.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "hassfest.sh: not a git repository" >&2
  exit 1
fi
tmp="$(mktemp -d)"
trap 'rm -rf "${tmp}"' EXIT
git archive "$(git write-tree)" | tar -x -C "${tmp}"
exec docker run --rm -v "${tmp}://github/workspace" ghcr.io/home-assistant/hassfest
