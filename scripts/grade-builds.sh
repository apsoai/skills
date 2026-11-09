#!/bin/sh
# Grades a quick-start build benchmark run (evals-forced/build-*).
#   claude plugin eval plugins/apso --eval-dir evals-forced --case 'build-*' --model haiku \
#     --runs 5 --ablation none --trust-plugin --allow-tools Write --keep-temp --json out.json
#   sh scripts/grade-builds.sh out.json haiku
# One tab-separated line per run: label case arm run seconds cost verdict entity-check.
# PASS = apso migrate builds it in Postgres, every FK leads an index, no redundant
# index, every entity the prompt asked for is present, every scopeBy column exists.
ROOT=$(cd "$(dirname "$0")/.." && pwd)
node -e '
const j=require(require("path").resolve(process.argv[1]));for(const c of j.cases)for(const [arm,runs] of Object.entries(c.arms))runs.forEach((r,i)=>console.log(c.name||c.id, arm, i, r.tracePath.replace(/\/out\/trace.jsonl$/,""), Math.round(r.durationSeconds), (r.costUsd||0).toFixed(4)))' "$1" |
while read case arm i k dur cost; do
  chmod 700 "$k" "$k/sealed" 2>/dev/null
  d="$k/sealed/home/cwd"; g="$ROOT/plugins/apso/evals-forced/$case/build-check"
  if [ ! -f "$d/.apsorc" ]; then v="FAIL no .apsorc"; info="{}"
  else
    info=$(node "$ROOT/scripts/pg-check/build-check.mjs" "$g/expected.json" "$d/.apsorc" 2>&1 | tail -1)
    pg=$(cd "$ROOT" && node scripts/pg-check/index-check.mjs "$g" "$d" 2>&1 | grep -E '^(OK|FAIL)' | tr '\n' ' ')
    if echo "$info" | grep -q '"ok":true' && echo "$pg" | grep -q '^OK'; then v=PASS; else v="FAIL $pg"; fi
  fi
  printf '%s\t%s\t%s\t%s\t%ss\t$%s\t%s\t%s\n' "${2:-run}" "$case" "$arm" "$i" "$dur" "$cost" "$v" "$info"
done
