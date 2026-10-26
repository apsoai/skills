#!/bin/sh
# Runs the plugin evals for staged skill changes. Only fires when Claude Code
# commits (CLAUDECODE=1); SKIP_EVALS=1 skips it.
# Every .apsorc an eval run writes must also pass `apso schema validate --local`,
# and migration cases must pass scripts/migration-check against seeded rows.
# A failing case gets one retry: the Haiku judge occasionally fails a correct
# answer, and with ~30 cases at one run each, one such flake per full run is
# likely. A real regression fails both times.
# Install once per clone: ln -sf ../../scripts/pre-commit-evals.sh .git/hooks/pre-commit
[ "$CLAUDECODE" = 1 ] && [ -z "$SKIP_EVALS" ] || exit 0
cd "$(git rev-parse --show-toplevel)" || exit 1
E=plugins/apso/evals
staged=$(git diff --cached --name-only -- plugins/apso/skills plugins/apso/references $E)
[ -n "$staged" ] || exit 0
run() { claude plugin eval plugins/apso --runs 1 --ablation none --trust-plugin --allow-tools Write --no-publish --threshold 1 --keep-temp "$@"; }

# Print the cases that scored below 1 in --json report $1, or $2 when the
# report is missing (the run crashed).
scored_below() {
  node -e 'try{for(const c of JSON.parse(require("fs").readFileSync(process.argv[1])).cases)if(!(c.aggregates.score>=1))console.log(c.name)}catch(e){console.log(process.argv[2])}' "$1" "$2"
}

# Validate the .apsorc in each kept run dir listed in --json report $1, print
# the names of cases that fail, then delete the dir. The report gives each
# case's dir and its run's trace path.
validate() {
  [ -f "$1" ] || return 0
  pairs=$(awk -F'"' '/"dir":/{c=$4; sub(/.*\//,"",c)} /"tracePath":/{p=$4; sub(/\/out\/trace.jsonl$/,"",p); print c ":" p}' "$1")
  for cp in $pairs; do
    c=${cp%%:*}; k=${cp#*:}
    chmod 700 "$k" "$k/sealed" 2>/dev/null
    if [ -f "$k/sealed/home/cwd/.apsorc" ]; then
      d=$(mktemp -d); cp "$k/sealed/home/cwd/.apsorc" "$d/"
      if ! out=$(cd "$d" && npx -y @apso/cli@latest schema validate --local 2>&1); then
        printf -- '--- INVALID .apsorc from %s:\n%s\n' "$c" "$out" >&2; echo "$c"
      fi
      # The CLI generates the inverse side itself, so A OneToMany B plus
      # B ManyToOne A is redundant, and with differing names gives A two
      # collections for one foreign key. The docs say declare once.
      if ! out=$(node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1])).relationships||[];const d=r.filter(a=>a.type==="OneToMany"&&(a.from===a.to||r.some(b=>b.type==="ManyToOne"&&b.from===a.to&&b.to===a.from)));d.forEach(a=>console.log(`${a.from} OneToMany ${a.to} duplicates its ManyToOne side`));process.exit(d.length?1:0)' "$d/.apsorc" 2>&1); then
        printf -- '--- DUPLICATE relationship sides in .apsorc from %s:\n%s\n' "$c" "$out" >&2; echo "$c"
      fi
      rm -rf "$d"
    fi
    # Migration cases: apply the agent's migration to seeded rows and check them.
    if [ -d "$E/$c/migration-check" ]; then
      if ! out=$(node scripts/migration-check/check.mjs "$E/$c/migration-check" "$k/sealed/home/cwd" 2>&1); then
        printf -- '--- MIGRATION CHECK failed for %s:\n%s\n' "$c" "$out" >&2; echo "$c"
      fi
    fi
    chmod -R u+w "$k" 2>/dev/null; rm -rf "$k"
  done
}

# Run cases $2... (or the whole suite when given ALL) and print the ones that
# fail the eval score or validation. $tmp/<label>-<case>.log keeps the output.
run_cases() {
  label=$1; shift
  if [ "$1" = ALL ]; then
    run -j 4 --json "$tmp/$label-all.json" > "$tmp/$label-all.log" 2>&1
    { scored_below "$tmp/$label-all.json" ALL; validate "$tmp/$label-all.json"; } | sort -u
    return
  fi
  pids=""
  for c in "$@"; do run --case "$c" --json "$tmp/$label-$c.json" > "$tmp/$label-$c.log" 2>&1 & pids="$pids $!"; done
  for p in $pids; do wait "$p"; done
  for c in "$@"; do scored_below "$tmp/$label-$c.json" "$c"; validate "$tmp/$label-$c.json"; done | sort -u
}

[ -d scripts/migration-check/node_modules ] || npm ci --silent --prefix scripts/migration-check >&2
tmp=$(mktemp -d)

# references/ is shared by every skill, so run the whole suite. Otherwise map
# each changed skill to the cases whose skill-fired grader names it.
if echo "$staged" | grep -q '^plugins/apso/references/'; then
  cases=ALL
  echo "pre-commit: running all skill evals (~5 min). SKIP_EVALS=1 to skip." >&2
else
  cases=$(echo "$staged" | sed -n "s|^$E/\([^/]*\)/.*|\1|p")
  for s in $(echo "$staged" | sed -n 's|^plugins/apso/skills/\([^/]*\)/.*|\1|p' | sort -u); do
    cases="$cases $(grep -lF ")?$s\"" $E/*/graders/*.md | cut -d/ -f4)"
  done
  cases=$(for c in $cases; do [ -d "$E/$c" ] && [ "$c" != results ] && echo "$c"; done | sort -u)
  [ -n "$cases" ] || { rm -rf "$tmp"; exit 0; }
  echo "pre-commit: skill evals for" $cases "(~1-2 min). SKIP_EVALS=1 to skip." >&2
fi

# shellcheck disable=SC2086
bad=$(run_cases first $cases)
if echo "$bad" | grep -qx ALL; then
  echo "--- eval run failed:" >&2; tail -60 "$tmp/first-all.log" >&2; rm -rf "$tmp"; exit 1
fi
[ -n "$bad" ] || { rm -rf "$tmp"; exit 0; }

echo "pre-commit: retrying" $bad >&2
# shellcheck disable=SC2086
still=$(run_cases retry $bad)
if [ -n "$still" ]; then
  for c in $still; do echo "--- FAILED twice: $c" >&2; tail -40 "$tmp/retry-$c.log" >&2; done
  rm -rf "$tmp"; exit 1
fi
echo "pre-commit: passed on retry:" $bad >&2
rm -rf "$tmp"; exit 0
