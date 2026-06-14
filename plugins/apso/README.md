# Apso — Claude Cowork / Claude Code Plugin

Database schema design patterns, REST API generation, and backend deployment.
Describe what your application manages and get a validated schema and a
production-ready REST API.

## Install

**Claude Cowork** — Open Cowork → Plugins → upload `Apso.plugin`.

**Claude Code**

```bash
# From the apsoai marketplace
claude plugin marketplace add apsoai/skills
claude plugin install apso

# Or add the MCP server directly
claude mcp add apso -- npx @apso/cli mcp serve
```

## Skills

### Schema Design

| Skill | What it does |
|-------|-------------|
| **schema-designer** | Design a database schema from application requirements |
| **multi-tenancy** | Add tenant data isolation (organization-scoped queries) |
| **auth-entities** | Authentication entities (users, sessions, roles, permissions) |
| **audit-trail** | Track who changed what and when |
| **soft-delete** | Mark records as deleted instead of removing them |
| **hierarchical-data** | Tree structures (categories, folders, org charts) |
| **billing-subscription** | Stripe-compatible billing and subscription entities |
| **notification-system** | In-app notifications with delivery preferences |
| **file-storage** | File uploads, attachments, and media references |
| **workflow-state** | State machines, approval chains, pipeline stages |
| **tagging-taxonomy** | Tags, categories, and faceted classification |
| **domain-events** | Reliable event emission — transactional outbox, lifecycle + semantic events, delivery |

### API Building

| Skill | What it does |
|-------|-------------|
| **api-builder** | Generate a production-ready REST API from a schema |
| **auth-setup** | Add authentication and multi-tenancy to an API |
| **custom-endpoints** | Add business logic beyond generated CRUD |
| **deployment** | Deploy the API to production (AWS) |

## MCP Tools

When connected as an MCP server, these tools are available:

| Tool | Description |
|------|-------------|
| `design_schema` | Design a database schema from requirements |
| `validate_schema` | Check a schema for errors |
| `scaffold_api` | Generate a REST API from a schema |
| `setup_auth` | Add authentication to an API |
| `start_dev_server` | Start local development environment |
| `deploy_api` | Deploy to production |

## Structure

```
apso/
├── .claude-plugin/plugin.json   # Manifest
├── .mcp.json                    # Apso MCP server (connector)
├── skills/                      # 15 schema + API skills
└── references/                  # Apso schema guide
```

## Powered By

[Apso](https://apso.dev) — Backend-as-a-service. Define a schema, get a production API.
