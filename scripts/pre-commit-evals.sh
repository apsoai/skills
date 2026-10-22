#!/bin/sh
# Runs the plugin evals for staged skill changes. Only fires when Claude Code
# commits (CLAUDECODE=1); SKIP_EVALS=1 skips it.
# Every .apsorc an eval run writes must also pass `apso schema validate --local`.
# Install once per clone: ln -sf ../../scripts/pre-commit-evals.sh .git/hooks/pre-commit
[ "$CLAUDECODE" = 1 ] && [ -z "$SKIP_EVALS" ] || exit 0
cd "$(git rev-parse --show-toplevel)" || exit 1
E=plugins/apso/evals
staged=$(git diff --cached --name-only -- plugins/apso/skills plugins/apso/references $E)
[ -n "$staged" ] || exit 0
run() { claude plugin eval plugins/apso --runs 1 --ablation none --trust-plugin --allow-tools Write --no-publish --threshold 1 --keep-temp "$@"; }

# Validate the .apsorc in each kept run dir listed in --json report $1, then
# delete the dir. The report gives each case's dir and its run's trace path.
validate() {
  ok=0
  pairs=$(awk -F'"' '/"dir":/{c=$4; sub(/.*\//,"",c)} /"tracePath":/{p=$4; sub(/\/out\/trace.jsonl$/,"",p); print c ":" p}' "$1")
  for cp in $pairs; do
    c=${cp%%:*}; k=${cp#*:}
    chmod 700 "$k" "$k/sealed" 2>/dev/null
    if [ -f "$k/sealed/home/cwd/.apsorc" ]; then
      d=$(mktemp -d); cp "$k/sealed/home/cwd/.apsorc" "$d/"
      if ! out=$(cd "$d" && npx -y @apso/cli@latest schema validate --local 2>&1); then
        printf -- '--- INVALID .apsorc from %s:\n%s\n' "$c" "$out" >&2; ok=1
      fi
      # The CLI generates the inverse side itself, so A OneToMany B plus
      # B ManyToOne A is redundant, and with differing names gives A two
      # collections for one foreign key. The docs say declare once.
      if ! out=$(node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1])).relationships||[];const d=r.filter(a=>a.type==="OneToMany"&&(a.from===a.to||r.some(b=>b.type==="ManyToOne"&&b.from===a.to&&b.to===a.from)));d.forEach(a=>console.log(`${a.from} OneToMany ${a.to} duplicates its ManyToOne side`));process.exit(d.length?1:0)' "$d/.apsorc" 2>&1); then
        printf -- '--- DUPLICATE relationship sides in .apsorc from %s:\n%s\n' "$c" "$out" >&2; ok=1
      fi
      rm -rf "$d"
    fi
    chmod -R u+w "$k" 2>/dev/null; rm -rf "$k"
  done
  return $ok
}

tmp=$(mktemp -d); fail=0
# references/ is shared by every skill, so run the whole suite.
if echo "$staged" | grep -q '^plugins/apso/references/'; then
  echo "pre-commit: running all skill evals (~4 min). SKIP_EVALS=1 to skip." >&2
  run -j 4 --json "$tmp/all.json" > "$tmp/all.log" 2>&1 || { fail=1; tail -60 "$tmp/all.log" >&2; }
  validate "$tmp/all.json" || fail=1
  rm -rf "$tmp"; exit $fail
fi

# Map each changed skill to the cases whose skill-fired grader names it.
cases=$(echo "$staged" | sed -n "s|^$E/\([^/]*\)/.*|\1|p")
for s in $(echo "$staged" | sed -n 's|^plugins/apso/skills/\([^/]*\)/.*|\1|p' | sort -u); do
  cases="$cases $(grep -lF ")?$s\"" $E/*/graders/*.md | cut -d/ -f4)"
done
cases=$(for c in $cases; do [ -d "$E/$c" ] && [ "$c" != results ] && echo "$c"; done | sort -u)
[ -n "$cases" ] || exit 0

echo "pre-commit: skill evals for" $cases "(~1-2 min). SKIP_EVALS=1 to skip." >&2
pids=""
for c in $cases; do run --case "$c" --json "$tmp/$c.json" > "$tmp/$c.log" 2>&1 & pids="$pids $!:$c"; done
for p in $pids; do
  wait "${p%%:*}" && continue
  fail=1; echo "--- FAILED: ${p#*:}" >&2; tail -40 "$tmp/${p#*:}.log" >&2
done
for c in $cases; do validate "$tmp/$c.json" || fail=1; done
rm -rf "$tmp"; exit $fail
