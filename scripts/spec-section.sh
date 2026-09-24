#!/usr/bin/env bash
# Print one section from the complete development spec.
# Usage: scripts/spec-section.sh "<heading or screen ID>"
set -euo pipefail

if [ "${1:-}" = "" ]; then
  echo "Usage: $0 \"<heading or screen ID>\"" >&2
  exit 1
fi

QUERY="$1"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SPEC="$ROOT/Global-Student-Cube-Complete-Development-Specification.md"

if [ ! -f "$SPEC" ]; then
  echo "Spec not found: $SPEC" >&2
  exit 1
fi

if command -v python3 >/dev/null 2>&1; then
  PYTHON=python3
elif command -v python >/dev/null 2>&1; then
  PYTHON=python
else
  echo "python3 or python is required to extract spec sections." >&2
  exit 1
fi

"$PYTHON" - "$QUERY" "$SPEC" <<'PY'
from pathlib import Path
import re
import sys

query = sys.argv[1]
spec_path = Path(sys.argv[2])
heading = re.compile(r"^(#{1,6}) (.+)$")
needle = query.lower()
lines = spec_path.read_text(encoding="utf-8").splitlines()

start = None
start_level = 0
for index, line in enumerate(lines):
    match = heading.match(line)
    if match is None:
        continue
    level = len(match.group(1))
    if start is None:
        if needle in line.lower():
            start = index
            start_level = level
        continue
    if level <= start_level:
        sys.stdout.write("\n".join(lines[start:index]) + "\n")
        raise SystemExit(0)

if start is None:
    sys.stderr.write(f"No section matching: {query}\n")
    raise SystemExit(1)

sys.stdout.write("\n".join(lines[start:]) + "\n")
PY
