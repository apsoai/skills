---
name: deployment
description: Deploy an API to production. Handles build, database migration, and infrastructure provisioning on AWS. Triggers on "deploy", "deploy to production", "ship it", "go live", "deploy the API", "deploy the backend".
---

# Deployment

Deploy your API to production on AWS. Handles the build, database migration, and infrastructure provisioning.

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
