#!/bin/sh
# Start the local stack: Auth and Firestore emulators, fixture data, and Vite.
# Ctrl+C stops Vite and the emulators this script started.
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$ROOT"

if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install
fi

if [ -z "${JAVA_HOME:-}" ] && [ -d /opt/homebrew/opt/openjdk ]; then
  export JAVA_HOME=/opt/homebrew/opt/openjdk
  export PATH="$JAVA_HOME/bin:$PATH"
fi

# Fixture login needs a configured Firebase app. Emulators ignore the key.
# This command always uses the emulator project the seed script writes to.
export VITE_ENABLE_FIXTURES=true
export VITE_USE_EMULATORS=true
export VITE_FIREBASE_PROJECT_ID=tri-ai-research-mentorship

filled_in_env_file() {
  file=$1
  name=$2
  [ -f "$file" ] || return 1
  grep -E "^${name}=[^[:space:]#\"']+" "$file" >/dev/null 2>&1
}

use_fallback_unless_configured() {
  name=$1
  fallback=$2
  current=$(eval "printf '%s' \"\${$name-}\"")
  if [ -n "$current" ]; then
    return
  fi
  if filled_in_env_file .env "$name"; then
    return
  fi
  export "$name=$fallback"
}

use_fallback_unless_configured VITE_FIREBASE_API_KEY demo-api-key
use_fallback_unless_configured VITE_FIREBASE_AUTH_DOMAIN tri-ai-research-mentorship.firebaseapp.com
use_fallback_unless_configured VITE_FIREBASE_APP_ID 1:1234567890:web:dev

AUTH_URL="http://127.0.0.1:9099/emulator/v1/projects/tri-ai-research-mentorship/accounts"
FIRESTORE_URL="http://127.0.0.1:8080/"

up() {
  curl -s -o /dev/null --connect-timeout 1 --max-time 2 "$1"
}

EMU_PID=""
LOG=""

kill_tree() {
  pid=$1
  for child in $(pgrep -P "$pid" 2>/dev/null || true); do
    kill_tree "$child"
  done
  kill "$pid" 2>/dev/null || true
}

cleanup() {
  if [ -n "$EMU_PID" ]; then
    pid=$EMU_PID
    EMU_PID=""
    kill_tree "$pid"
    wait "$pid" 2>/dev/null || true
  fi
  if [ -n "$LOG" ] && [ -f "$LOG" ]; then
    rm -f "$LOG"
  fi
}

trap cleanup EXIT
trap 'cleanup; exit 130' INT TERM

if up "$AUTH_URL" && up "$FIRESTORE_URL"; then
  echo "Using Auth and Firestore emulators already running on ports 9099 and 8080."
elif up "$AUTH_URL" || up "$FIRESTORE_URL"; then
  echo "Port 9099 or 8080 is already in use, but both emulators are not ready." >&2
  echo "Stop the other process, or start both with npm run emulators." >&2
  exit 1
else
  echo "Starting Auth and Firestore emulators..."
  LOG=$(mktemp "${TMPDIR:-/tmp}/tri-emulators.XXXXXX")
  sh scripts/emulators.sh >"$LOG" 2>&1 &
  EMU_PID=$!

  i=0
  while [ "$i" -lt 90 ]; do
    if up "$AUTH_URL" && up "$FIRESTORE_URL"; then
      break
    fi
    if ! kill -0 "$EMU_PID" 2>/dev/null; then
      echo "Emulators exited before they were ready:" >&2
      cat "$LOG" >&2
      exit 1
    fi
    i=$((i + 1))
    sleep 1
  done

  if ! up "$AUTH_URL" || ! up "$FIRESTORE_URL"; then
    echo "Timed out waiting for the emulators:" >&2
    cat "$LOG" >&2
    exit 1
  fi
fi

npm run seed:fixtures

echo ""
echo "App:          http://localhost:5173/#/login"
echo "Emulator UI:  http://127.0.0.1:4000"
echo "Password:     fixture-pass"
echo "Ctrl+C stops the app and any emulators this command started."
echo ""

npm run dev
