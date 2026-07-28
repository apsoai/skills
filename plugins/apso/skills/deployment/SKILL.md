---
name: deployment
category: uncategorized
description: Deploy an API to production. Handles build, database migration, and infrastructure provisioning on AWS. Triggers on "deploy", "deploy to production", "ship it", "go live", "deploy the API", "deploy the backend".
---

# Deployment

Deploy your API to production on AWS. Handles the build, database migration, and infrastructure provisioning.

## Headless / agent usage (READ THIS IF YOU ARE AN AGENT)

If an agent, script, or CI is driving the CLI, run **headless** — never rely on the
interactive prompts shown later in this doc. Set `APSO_NONINTERACTIVE=1` (the CLI
also auto-detects a non-TTY). In headless mode the CLI **never blocks on a prompt**:
if a required value is missing it exits with an error naming the flag to pass, so
you can retry deterministically.

```bash
export APSO_NONINTERACTIVE=1

# Auth without a browser: use an API token (from the platform), not the OAuth flow
apso login --token "$APSO_API_TOKEN"

# Set the active workspace once (or pass --workspace <slug> to each command)
apso use <workspace-slug>

# In the project directory (a .apsorc must exist):
apso generate -l typescript

# Create + link a NEW service in one call:
apso link --workspace <workspace-slug> --create <service-name>
#   ...or link an EXISTING service:
apso link --workspace <workspace-slug> --service <service-slug>

# Deploy without the confirmation prompt.
# deploy auto-creates the GitHub repo if the service has none, and pushes the
# code THROUGH the user's Apso GitHub connection (no local git or `gh` needed —
# a bare machine works with only `apso login` + a one-time GitHub connect).
# Use --local-git to push with local git instead.
apso deploy --yes --no-wait

# Machine-readable output for parsing:
apso projects --json
apso whoami
```

Rules for headless callers:
- Every workspace-scoped command needs a workspace — set it with `apso use <slug>`
  once, or pass `--workspace <slug>`. Use the workspace **slug**, not its name.
- **Empty account (no workspaces):** workspaces are created in the web app, NOT the
  CLI — there is no `apso workspace create`. If `apso use` / `apso projects` reports
  no workspaces, stop and tell the user to create one at
  `<web-app>/onboarding/workspace` (e.g. `https://app.apso.cloud/onboarding/workspace`),
  then re-run `apso use`. Don't try to create it yourself.
- `apso link --create <name>` creates a service; `--service <slug>` links an existing one.
- `apso deploy --yes` skips the migration-count confirmation.
- Plan-limit errors (e.g. free tier) come back as a plain error with an upgrade URL —
  the CLI will not open a browser in headless mode.
- **GitHub connect is the one interactive exception.** `apso github connect` is a
  browser OAuth flow a machine can't complete, and it's the only step needing a
  human. Handle it like this when driving headless:
  1. Detect the need — `apso status` shows "GitHub: not connected", or `apso deploy`
     exits with "GitHub is not connected."
  2. **Tell the user** you need them to connect GitHub, then run the connect command
     in an **interactive shell / sub-agent** (a real TTY, WITHOUT
     `APSO_NONINTERACTIVE`) so the browser opens and the human completes it:
     ```bash
     apso github connect     # opens the browser; blocks until connected
     ```
  3. Once it returns, re-run `apso deploy --yes`. It stays connected afterward.

  Interactive humans get this for free: running `apso deploy` when GitHub isn't
  connected prompts "Connect now?" and launches the flow inline.

## Human quickstart (interactive)

For a person at a terminal, `apso init` is a guided wizard — run it from anywhere:

```bash
apso login              # browser OAuth
apso use                # pick your workspace (interactive)
apso init               # name, language, workspace -> scaffolds + creates + links a service
cd <project>
# edit .apsorc, then:
apso generate
apso deploy             # prompts to connect GitHub if needed, then ships
```

## Prerequisites

- Working API locally (`apso dev` runs without errors)
- Apso account (`apso login`)
- Project linked to platform (`apso link`)

## Deploy Process

### Step 1: Authenticate

```bash
apso login
```

### Step 2: Link Project

If not already linked:

```bash
apso link
```

This associates your local project with a service on the Apso platform.

### Step 3: Test Migrations Locally

```bash
# Preview migration SQL in a PGlite sandbox
apso migrate

# If the SQL looks correct, apply the snapshot
apso migrate --apply
```

The migrate command runs your schema changes against a local PGlite database to catch errors before deploying to production.

### Step 4: Deploy

```bash
apso deploy
```

This triggers the build pipeline:
1. Validates the schema
2. Runs the migration sandbox
3. Shows a SQL preview of pending migrations
4. Asks for confirmation
5. Triggers the build on the platform
6. Polls for completion

### Skip Confirmation

```bash
apso deploy --yes
```

### Skip Migration Check

```bash
apso deploy --skip-migrate
```

### Fire and Forget

```bash
apso deploy --no-wait
```

Triggers the build but doesn't wait for completion. Check status with `apso status`.

## What Gets Deployed

The Apso platform provisions:

| Component | AWS Service |
|-----------|------------|
| API runtime | Lambda |
| Database | RDS PostgreSQL |
| API routing | API Gateway |
| Static assets | S3 + CloudFront |

## Post-Deploy

### Check Status

```bash
apso status
```

Shows service status, last deploy time, and build information.

### View Logs

```bash
apso logs
```

### Open Dashboard

```bash
apso open
```

Opens the service dashboard in your browser.

## Environment Configuration

Production environment variables are managed through the Apso platform dashboard. Sensitive values (database credentials, auth secrets) are stored securely and injected at runtime.

```bash
# View current config
apso config
```

## Schema Updates in Production

When you change your schema after the initial deploy:

```bash
# Edit .apsorc
# ...

# Regenerate code
apso generate

# Test migration locally
apso migrate

# Deploy changes
apso deploy
```

The deploy command detects schema changes and runs migrations against the production database during deployment.

## Environments

| Environment | Purpose |
|-------------|---------|
| Local | `apso dev` — Docker Compose, PostgreSQL on localhost |
| Staging | Deploy to staging for testing before production |
| Production | `apso deploy` — Full AWS deployment |

## Rollback

If a deployment causes issues:

1. Check logs: `apso logs`
2. View status: `apso status`
3. Fix the issue in your schema or code
4. Deploy the fix: `apso deploy`

The platform maintains deployment history for troubleshooting.
