#!/bin/sh
set -eu

if [ -z "${JAVA_HOME:-}" ] && [ -d /opt/homebrew/opt/openjdk ]; then
  export JAVA_HOME=/opt/homebrew/opt/openjdk
  export PATH="$JAVA_HOME/bin:$PATH"
fi

export VITE_ENABLE_FIXTURES="${VITE_ENABLE_FIXTURES:-true}"
export VITE_USE_EMULATORS="${VITE_USE_EMULATORS:-true}"
export VITE_FIREBASE_PROJECT_ID="${VITE_FIREBASE_PROJECT_ID:-tri-ai-research-mentorship}"
export VITE_FIREBASE_AUTH_DOMAIN="${VITE_FIREBASE_AUTH_DOMAIN:-tri-ai-research-mentorship.firebaseapp.com}"
export VITE_FIREBASE_API_KEY="${VITE_FIREBASE_API_KEY:-demo-api-key}"
export VITE_FIREBASE_APP_ID="${VITE_FIREBASE_APP_ID:-1:1234567890:web:e2e}"

npx -y firebase-tools@latest emulators:exec \
  --only auth,firestore \
  --project tri-ai-research-mentorship \
  "npm run seed:fixtures && npm run test:e2e"
