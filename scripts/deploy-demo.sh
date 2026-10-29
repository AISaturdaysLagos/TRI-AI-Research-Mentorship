#!/bin/sh
set -eu
cd "$(dirname "$0")/.."

project="tri-ai-research-mentorship"
app="1:951151548194:web:5b1eaa2d4afd58a88d377b"
raw=$(npx -y firebase-tools@latest apps:sdkconfig WEB "$app" --project "$project")

eval "$(node --input-type=module -e '
import { readFileSync } from "node:fs";
const raw = readFileSync(0, "utf8");
const start = raw.indexOf("{");
const end = raw.lastIndexOf("}");
if (start < 0 || end < start) {
  console.error("Could not read the Firebase web config.");
  process.exit(1);
}
const config = JSON.parse(raw.slice(start, end + 1));
const keys = ["apiKey", "authDomain", "projectId", "appId"];
for (const key of keys) {
  if (!config[key]) {
    console.error("Missing " + key);
    process.exit(1);
  }
}
const names = {
  apiKey: "VITE_FIREBASE_API_KEY",
  authDomain: "VITE_FIREBASE_AUTH_DOMAIN",
  projectId: "VITE_FIREBASE_PROJECT_ID",
  appId: "VITE_FIREBASE_APP_ID",
};
for (const [key, name] of Object.entries(names)) {
  process.stdout.write(`export ${name}=${JSON.stringify(config[key])}\n`);
}
' <<EOF
$raw
EOF
)"

export VITE_ENABLE_FIXTURES=true
unset VITE_USE_EMULATORS
npm run build
npx -y firebase-tools@latest deploy --only hosting,firestore:rules,firestore:indexes --project "$project" --non-interactive --force
