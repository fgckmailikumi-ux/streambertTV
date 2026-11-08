#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
PROFILE=${1:-${TIZEN_SECURITY_PROFILE:-}}

if [ -z "$PROFILE" ]; then
  echo "Usage: $0 <Tizen-security-profile-name>" >&2
  echo "Create a signing profile in Tizen Studio Certificate Manager first." >&2
  exit 2
fi
if ! command -v tizen >/dev/null 2>&1; then
  echo "Tizen CLI not found. Install Tizen Studio and add its tools to PATH." >&2
  exit 127
fi

cd "$PROJECT_DIR"
tizen build-web -- .
tizen package --type wgt --sign "$PROFILE" -- .buildResult
printf '\nBuild finished. Find the signed WGT in:\n  %s/.buildResult\n' "$PROJECT_DIR"
