# API Tools — Claude Code Skills Plugin

Database schema design patterns, REST API generation, and backend deployment. Works with any AI coding agent that supports Claude Code skills or MCP.

## Install

```bash
# Claude Code plugin
claude plugin install apsoai/skills

# Or add MCP server directly
claude mcp add api-tools -- npx @apso/cli mcp serve
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

## How It Works

1. Describe what your application manages
2. The `schema-designer` skill produces a validated schema
3. The `api-builder` skill generates a complete REST API
4. The `auth-setup` skill adds authentication
5. The `deployment` skill ships it to production

Each schema design skill adds a specific pattern (billing, notifications, file uploads, etc.) to your schema. Mix and match as needed.

## Works With

- **Claude Code** — Skills loaded automatically from plugin
- **Cursor** — Via MCP server configuration
- **Windsurf** — Via MCP server configuration
- **Claude API** — Via MCP connector
- **Any MCP client** — Via stdio transport

## Powered By

[Apso](https://apso.dev) — Backend-as-a-service. Define a schema, get a production API.
