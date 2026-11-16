# Skill evals

The evals check that the Apso skills make Claude produce schemas, migrations and setup steps that the Apso CLI accepts and that hold up on a real Postgres database. They run locally with `claude plugin eval`. There is no CI run.

## Setup (once per clone or worktree)

```bash
npm ci --prefix scripts/pg-check

# The pre-commit hook. Use this wrapper, not a symlink: a symlinked hook resolves
# through the shared .git folder, so a commit from a worktree would run the main
# checkout's copy of the script, which may be on an old branch.
printf '#!/bin/sh\nexec sh "$(git rev-parse --show-toplevel)/scripts/pre-commit-evals.sh" "$@"\n' \
  > "$(git rev-parse --git-common-dir)/hooks/pre-commit"
chmod +x "$(git rev-parse --git-common-dir)/hooks/pre-commit"
```

## Running them

| What | Command | Cost and time |
|---|---|---|
| The cases a commit touches | Commit from Claude Code. The hook maps each staged skill to the cases whose `skill-fired` grader names it | about $0.16 and 1 minute per case |
| Chosen cases, no commit | `sh scripts/pre-commit-evals.sh schema-designer-crm migration-rename-field` | same |
| Every case | `sh scripts/pre-commit-evals.sh ALL` | about $0.16 per case (34 cases), 6 to 8 minutes with 4 in parallel |
| With vs without the plugin | `claude plugin eval plugins/apso --case <name> --runs 3 --trust-plugin --allow-tools Write` (leave out `--ablation none`) | about 2x a normal run |
| Against an unreleased CLI | `APSO_CLI_BIN=/path/to/apso-cli/bin/run sh scripts/pre-commit-evals.sh ALL` | same |

The script runs each case once, gives a failing case one retry (the Haiku judge sometimes fails a correct answer), and fails the commit when a case fails twice. Every `.apsorc` a run writes must also pass `apso schema validate --local`, and a case with a `migration-check/`, `index-check/` or `query-check/` folder must pass the matching `scripts/pg-check` check on PGlite.

`APSO_CLI_BIN` covers the script's own checks (validation and pg-check). The plugin's MCP server inside the eval still runs the npm version that `.mcp.json` pins, so a CLI change to an MCP tool only shows up in evals after it is published.

`SKIP_EVALS=1` skips the hook. Use it only after running the script by hand and seeing it pass, and say so in the commit or PR.

## Anatomy of a case

```
plugins/apso/evals/<case>/
  case.yaml          # prompt_file, allowed tools, add_dirs: [refs]
  prompt.md          # what the user asks
  refs -> ../../references
  graders/*.md       # one grader per file
  migration-check/   # optional: before.sql seed rows, check.sql assertions
  index-check/       # optional: the query workload the indexes must serve
  query-check/       # optional: adversarial rows for the agent's SQL
```

Graders, from most to least reliable:
- `file_exists`, and `regex` on a file with `target: {source: file, path: .apsorc}`. Use these for anything mechanical. They are JavaScript regexes, so `(?i)` does not work.
- `tool_used` with `tool: Skill` (the `skill-fired` grader). The hook uses it to map a skill to its cases, so every case needs one.
- `llm`. Haiku judges the agent's last message only, so the prompt must ask the agent to print the final `.apsorc`. Keep each criterion to one short point, name example entities as examples, and list the real CLI commands, or the judge fails correct answers.

## Adding a case

1. Copy a case close to the new one and keep its `case.yaml` and `refs` symlink. A case without its own `add_dirs` fails in a full run on a sibling's symlink.
2. Write the prompt from the real request or bug that prompted it.
3. Check whatever you can with a regex or a pg-check folder before you reach for an `llm` grader.
4. Run it with and without the plugin. A case where plain Claude also scores 1 only guards against regressions; say so in the PR.

Add a case for every regression found by a user or in production.

## Changing the CLI with the evals

The skills depend on the CLI in three places: the MCP server (`.mcp.json`), the validation step in each skill (`npx -y @apso/cli@^X.Y` as a fallback), and the eval script's checks. When a CLI change affects what the skills tell the agent:

1. Build the CLI branch and run `APSO_CLI_BIN=<branch>/bin/run sh scripts/pre-commit-evals.sh ALL` here.
2. Check MCP tools end to end by connecting an MCP client over stdio to `<branch>/bin/run mcp serve` and calling the tool. Unit tests miss this: before CLI 0.50, `validate_schema` over MCP skipped the linter that `apso schema validate` runs, and only an MCP client showed it.
3. Merge the CLI PR. Every push to the CLI's `main` publishes a release. When two merges land close together, the first publish run fails with "non-fast-forward" and the second publishes both, which is harmless. The new tarball can return 404 for several minutes after npm lists the version.
4. Move the version pin in `.mcp.json`, the skills and `hooks/check-cli.sh` to the new release in the same skills PR, and bump the web app's CLI pin (`src/lib/webcontainer-scaffold.ts` in the client) to the same version.
