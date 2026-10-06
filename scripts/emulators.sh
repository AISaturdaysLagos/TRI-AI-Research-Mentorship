#!/bin/sh
if [ -z "$JAVA_HOME" ] && [ -d /opt/homebrew/opt/openjdk ]; then
  export JAVA_HOME=/opt/homebrew/opt/openjdk
  export PATH="$JAVA_HOME/bin:$PATH"
fi
exec npx -y firebase-tools@latest emulators:start --only auth,firestore --project tri-ai-research-mentorship
