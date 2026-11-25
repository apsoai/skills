#!/bin/sh
# The Apso skills run the apso CLI. When it's missing, tell Claude to offer the
# install before the first apso command. Prints nothing when apso is on PATH.
command -v apso >/dev/null 2>&1 && exit 0
cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"The Apso CLI (apso) is not installed, and the Apso skills run it. Before the first apso command, offer to install it: npm i -g @apso/cli (or brew install apsoai/tap/apso). Until it is installed, run each command as npx -y @apso/cli@^0.58 <command>. Don't bring this up unless the user is doing Apso work."}}
JSON
