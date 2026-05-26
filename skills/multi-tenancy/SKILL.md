---
name: multi-tenancy
description: Add multi-tenant data isolation to a schema. Configures scopeBy to automatically filter queries by organization, workspace, or team. Triggers on "add multi-tenancy", "tenant isolation", "scope by organization", "data isolation".
---

# Multi-Tenancy Patterns

Add automatic tenant data isolation to your schema. When enabled, every query is filtered by the tenant identifier, every create injects the tenant value, and cross-tenant access is blocked.

## How It Works

Add `scopeBy` to any entity that should be tenant-isolated:

```json
{
  "name": "Project",
  "scopeBy": "organizationId",
  "fields": [...]
}
```

This generates:
- A `ScopeGuard` that intercepts every request
- Automatic query filtering (GET only returns tenant's data)
- Automatic injection on create (POST sets organizationId from auth context)
- Access verification on update/delete (can't modify another tenant's data)

## Patterns

### Pattern 1: Organization-Scoped (Most Common)

Every business entity belongs to an organization. Users see only their org's data.

```json
{
  "entities": [
    {
      "name": "Organization",
      "created_at": true,
      "updated_at": true,
      "fields": [
        { "name": "name", "type": "text", "length": 100 },
        { "name": "slug", "type": "text", "length": 50, "unique": true }
      ]
    },
    {
      "name": "Project",
      "scopeBy": "organizationId",
      "created_at": true,
      "updated_at": true,
      "fields": [
        { "name": "name", "type": "text", "length": 100 }
      ]
    },
    {
      "name": "Task",
      "scopeBy": "organizationId",
      "created_at": true,
      "updated_at": true,
      "fields": [
        { "name": "title", "type": "text", "length": 200 },
        { "name": "organizationId", "type": "text", "length": 50 }
      ]
    }
  ]
}
```

**When to use:** SaaS apps where each customer (organization) has isolated data.

### Pattern 2: Workspace-Scoped

Users can belong to multiple workspaces. Data is isolated per workspace, not per organization.

```json
{
  "entities": [
    {
      "name": "Workspace",
      "created_at": true,
      "updated_at": true,
      "fields": [
        { "name": "name", "type": "text", "length": 100 },
        { "name": "slug", "type": "text", "length": 50 }
      ]
    },
    {
      "name": "WorkspaceMember",
      "fields": [
        { "name": "role", "type": "enum", "values": ["owner", "admin", "member", "viewer"], "default": "member" }
      ]
    },
    {
      "name": "Document",
      "scopeBy": "workspaceId",
      "created_at": true,
      "updated_at": true,
      "fields": [
        { "name": "title", "type": "text", "length": 200 },
        { "name": "content", "type": "json-plain", "nullable": true }
      ]
    }
  ],
  "relationships": [
    { "from": "Workspace", "to": "WorkspaceMember", "type": "OneToMany" },
    { "from": "WorkspaceMember", "to": "Workspace", "type": "ManyToOne" },
    { "from": "User", "to": "WorkspaceMember", "type": "OneToMany" },
    { "from": "WorkspaceMember", "to": "User", "type": "ManyToOne" },
    { "from": "Workspace", "to": "Document", "type": "OneToMany" },
    { "from": "Document", "to": "Workspace", "type": "ManyToOne" }
  ]
}
```

**When to use:** Collaboration tools where users switch between workspaces (Slack, Notion, Linear).

### Pattern 3: Multi-Level Scope

Data is scoped by both organization and a sub-level (project, team, department).

```json
{
  "name": "Task",
  "scopeBy": ["organizationId", "projectId"],
  "fields": [
    { "name": "title", "type": "text", "length": 200 },
    { "name": "organizationId", "type": "text", "length": 50 }
  ]
}
```

**When to use:** When you need two levels of isolation (e.g., org-level billing but project-level data access).

### Pattern 4: Nested Scope

Scope through a related entity rather than a direct field.

```json
{
  "name": "Comment",
  "scopeBy": "task.organizationId",
  "fields": [
    { "name": "body", "type": "text" }
  ]
}
```

The guard joins to the `task` table to check `organizationId`. Useful when the entity doesn't store the tenant ID directly.

**When to use:** Deeply nested entities (comments on tasks, reactions on messages) where duplicating the tenant ID would be redundant.

## Scope Options

Fine-tune scope enforcement:

```json
{
  "name": "AuditLog",
  "scopeBy": "organizationId",
  "scopeOptions": {
    "injectOnCreate": true,
    "enforceOn": ["find", "get"],
    "bypassRoles": ["superadmin"]
  },
  "fields": [...]
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `injectOnCreate` | `true` | Auto-set tenant ID on POST requests |
| `enforceOn` | `["find","get","create","update","delete"]` | Which operations enforce scoping |
| `bypassRoles` | `[]` | Roles that skip scope checks |

### Common Configurations

**Read-only scope** (audit logs, analytics): enforce on `find` and `get` only.

**Admin bypass**: let `superadmin` role access all tenants (for support dashboards).

**No auto-inject**: set `injectOnCreate: false` when the client must explicitly provide the tenant ID.

## What NOT to Scope

- **Organization entity itself** — it's the tenant root, not scoped to itself
- **User entity** — users may belong to multiple orgs (use a junction table)
- **Global lookup tables** — countries, currencies, categories shared across tenants
- **Auth entities** — sessions, accounts, verification tokens (managed by auth provider)

## Indexes

Always add a composite index starting with the scope field:

```json
"indexes": [
  { "fields": ["organizationId", "status"] },
  { "fields": ["organizationId", "name"], "unique": true },
  { "fields": ["organizationId", "created_at"] }
]
```

This ensures tenant-filtered queries use the index instead of scanning the full table.
