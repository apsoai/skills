# Apso Agent Reference

> Canonical reference for AI coding agents. All types, commands, and formats are derived from CLI source code.
> Last verified against: `packages/apso-cli/src/lib/types/` and `src/commands/`

---

## CLI Commands

### Project Lifecycle

```bash
apso init                              # Create new project or clone existing
apso init --name my-app --language typescript --skip-platform
apso generate                          # Generate code from .apsorc schema
apso generate --language typescript    # Specify language explicitly
apso generate --skip-format            # Skip prettier formatting
apso dev                               # Start local dev server (Docker Compose)
apso dev --build --detach              # Rebuild images, run in background
apso deploy                            # Deploy to Apso platform
apso deploy --yes --skip-migrate       # Skip confirmation and migration check
apso deploy --no-wait                  # Trigger without waiting for completion
```

### Schema Management

```bash
apso migrate                  # Test migrations locally (PGlite sandbox)
apso migrate --apply          # Apply and update snapshot
apso migrate --reset          # Clear sandbox data
apso migrate --sql            # Output raw SQL only
apso schema validate          # Validate local .apsorc
apso schema validate --local  # Skip server-side validation
apso schema diff              # Diff local vs remote schema
apso schema push              # Push local schema to platform
apso schema pull              # Pull remote schema to local .apsorc
```

### Authentication and Linking

```bash
apso login                    # Authenticate with Apso platform
apso logout                   # Sign out
apso whoami                   # Display current user info
apso link                     # Link project to a platform service
apso unlink                   # Remove platform link
apso projects                 # List services in a workspace
apso status                   # Show service and build status
apso logs                     # View build logs
apso open                     # Open service dashboard in browser
apso config                   # View or modify CLI configuration
```

### Installation

```bash
# npm
npm install -g @apso/cli

# Homebrew
brew tap apsoai/tap && brew install apso
```

### Deprecated Commands (do not use)

| Old Command | Replacement |
|---|---|
| `apso server new` | `apso init` |
| `apso server scaffold` | `apso generate` |

---

## .apsorc File Format (Version 2)

The `.apsorc` file is a JSON file in the project root. The CLI finds it by searching upward from the current directory.

### Top-Level Structure

```json
{
  "version": 2,
  "rootFolder": "src",
  "apiType": "Rest",
  "language": "typescript",
  "entities": [],
  "relationships": [],
  "auth": {}
}
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `version` | `number` | `1` | Schema format version. Use `2`. |
| `rootFolder` | `string` | `"src"` | Source code root directory. |
| `apiType` | `"Rest" \| "Graphql"` | `"Rest"` | API type. GraphQL requires version 2. |
| `language` | `"typescript" \| "python" \| "go"` | _(prompt)_ | Target language. Can also pass via `--language` flag. |
| `entities` | `Entity[]` | `[]` | Array of entity definitions. |
| `relationships` | `Relationship[]` | `[]` | Array of relationship definitions (v2 only). |
| `auth` | `AuthConfig` | _(none)_ | Optional authentication configuration. |

---

## Entity Definition

```json
{
  "name": "Project",
  "created_at": true,
  "updated_at": true,
  "primaryKeyType": "serial",
  "scopeBy": "organizationId",
  "scopeOptions": {
    "injectOnCreate": true,
    "enforceOn": ["find", "get", "create", "update", "delete"],
    "bypassRoles": ["admin"]
  },
  "fields": [],
  "indexes": [],
  "uniques": []
}
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `name` | `string` | _(required)_ | Entity name in PascalCase. |
| `created_at` | `boolean` | `false` | Add `created_at` timestamp column. |
| `updated_at` | `boolean` | `false` | Add `updated_at` timestamp column. |
| `primaryKeyType` | `"serial" \| "uuid"` | `"serial"` | Primary key generation strategy. |
| `fields` | `Field[]` | `[]` | Array of field definitions. |
| `indexes` | `Index[]` | `[]` | Composite indexes. |
| `uniques` | `Unique[]` | `[]` | Composite unique constraints. |
| `scopeBy` | `string \| string[]` | _(none)_ | Multi-tenancy scope field(s). |
| `scopeOptions` | `ScopeOptions` | _(defaults)_ | Scope enforcement behavior. |

### ScopeBy

The `scopeBy` property enables automatic multi-tenant data isolation. When set, Apso generates guards that filter queries, verify access, and auto-inject scope values.

```json
// Single scope
"scopeBy": "organizationId"

// Multiple scopes
"scopeBy": ["organizationId", "projectId"]

// Nested scope (joins to related entity)
"scopeBy": "task.organizationId"
```

### ScopeOptions

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `injectOnCreate` | `boolean` | `true` | Auto-inject scope value on POST requests. |
| `enforceOn` | `ScopeOperation[]` | `["find","get","create","update","delete"]` | Which operations enforce scoping. |
| `bypassRoles` | `string[]` | `[]` | Roles that skip scope enforcement. |

---

## Field Definition

```json
{
  "name": "email",
  "type": "text",
  "length": 255,
  "nullable": false,
  "unique": true,
  "index": true,
  "is_email": true,
  "default": null
}
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `name` | `string` | _(required)_ | Field name in camelCase or snake_case. |
| `type` | `FieldType` | _(required)_ | Data type (see table below). |
| `nullable` | `boolean` | `false` | Allow NULL values. |
| `unique` | `boolean` | `false` | Unique constraint on this field. |
| `index` | `boolean` | `false` | Create index on this field. |
| `primary` | `boolean` | `false` | Mark as primary key. |
| `default` | `string \| null` | _(none)_ | Default value. |
| `length` | `number` | _(none)_ | Max length for text fields. |
| `precision` | `number` | _(none)_ | Total digits for decimal fields. |
| `scale` | `number` | _(none)_ | Decimal places for decimal fields. |
| `values` | `string[]` | _(none)_ | Allowed values for enum fields. |
| `is_email` | `boolean` | `false` | Email validation hint. |

### Field Types

| Type | Description | Relevant Options |
|------|-------------|-----------------|
| `text` | String/varchar | `length` |
| `integer` | Integer number | `default` |
| `float` | Floating point number | `default` |
| `decimal` | Fixed-precision decimal | `precision`, `scale` |
| `numeric` | Numeric (alias for decimal) | `precision`, `scale` |
| `boolean` | True/false | `default` |
| `date` | Date (no time) | `default` |
| `enum` | Enumerated values | `values` (required) |
| `json` | JSON column (TypeORM simple-json) | |
| `json-plain` | JSON column (raw jsonb) | |
| `array` | Array column | |

---

## Index Definition

```json
{
  "fields": ["organizationId", "status"],
  "unique": false
}
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `fields` | `string[]` | _(required)_ | Field names in the composite index. |
| `unique` | `boolean` | `false` | Whether this is a unique index. |

## Unique Constraint Definition

```json
{
  "fields": ["organizationId", "email"],
  "name": "UQ_org_email"
}
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `fields` | `string[]` | _(required)_ | Field names in the unique constraint. |
| `name` | `string` | _(auto)_ | Optional constraint name. |

---

## Relationship Definition (Version 2)

Relationships are defined in a separate top-level `relationships` array.

```json
{
  "from": "Project",
  "to": "Organization",
  "type": "ManyToOne",
  "to_name": "organization",
  "nullable": false,
  "index": true
}
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `from` | `string` | _(required)_ | Source entity name. |
| `to` | `string` | _(required)_ | Target entity name. |
| `type` | `RelationshipType` | _(required)_ | See relationship types below. |
| `to_name` | `string` | _(auto)_ | Property name on the source entity for the target. Used when multiple relationships exist to the same entity. |
| `nullable` | `boolean` | `false` | Whether the FK column allows NULL. |
| `bi_directional` | `boolean` | `false` | Whether to generate inverse navigation. |
| `cascadeDelete` | `boolean` | `false` | CASCADE on delete. |
| `index` | `boolean` | `false` | Index the FK column. |
| `joinTableName` | `string` | _(auto)_ | Custom join table name for ManyToMany. |
| `joinColumnName` | `string` | _(auto)_ | Custom FK column name in join table. |
| `inverseJoinColumnName` | `string` | _(auto)_ | Custom inverse FK column name in join table. |

### Relationship Types

| Type | Description | FK Column |
|------|-------------|-----------|
| `OneToMany` | Parent has many children. | FK on the child (the `to` entity). |
| `ManyToOne` | Child belongs to parent. | FK on `from` entity pointing to `to` entity. |
| `OneToOne` | One-to-one link. | FK on `from` entity. |
| `ManyToMany` | Join table between two entities. | Auto-generated join table. |

### Relationship Patterns

**One-to-Many / Many-to-One (most common):**
```json
{
  "relationships": [
    { "from": "Organization", "to": "Project", "type": "OneToMany" },
    { "from": "Project", "to": "Organization", "type": "ManyToOne" }
  ]
}
```

**Multiple relationships to same entity (use `to_name`):**
```json
{
  "relationships": [
    { "from": "Service", "to": "Stack", "type": "ManyToOne", "to_name": "networkStack", "nullable": true },
    { "from": "Service", "to": "Stack", "type": "ManyToOne", "to_name": "databaseStack", "nullable": true }
  ]
}
```

**Many-to-Many:**
```json
{
  "relationships": [
    { "from": "User", "to": "Role", "type": "ManyToMany", "bi_directional": true }
  ]
}
```

**Self-referencing:**
```json
{
  "relationships": [
    { "from": "Category", "to": "Category", "type": "ManyToOne", "to_name": "parent", "nullable": true }
  ]
}
```

---

## Auth Configuration

Auth is optional. When configured, `apso generate` produces auth and scope guards in `src/autogen/guards/`.

### BetterAuth / Custom DB Session

```json
{
  "auth": {
    "provider": "better-auth",
    "sessionEntity": "session",
    "userEntity": "User",
    "accountUserEntity": "AccountUser",
    "organizationField": "organizationId",
    "roleField": "role"
  }
}
```

### JWT Providers (Auth0, Clerk, Cognito)

```json
{
  "auth": {
    "provider": "auth0",
    "jwt": {
      "issuer": "https://your-tenant.auth0.com/",
      "audience": "https://api.yourapp.com"
    },
    "claims": {
      "userId": "sub",
      "email": "email",
      "roles": "roles",
      "organizationId": "org_id"
    }
  }
}
```

### API Key

```json
{
  "auth": {
    "provider": "api-key",
    "apiKeyHeader": "x-api-key",
    "apiKeyEntity": "ApiKey"
  }
}
```

Supported providers: `better-auth`, `custom-db-session`, `auth0`, `clerk`, `cognito`, `api-key`.

---

## Generated Code Structure

Running `apso generate` produces files in `{rootFolder}/autogen/`:

```
src/
  autogen/                      # NEVER MODIFY - overwritten on every generate
    {EntityName}/
      {EntityName}.entity.ts    # TypeORM entity
      {EntityName}.service.ts   # CRUD service
      {EntityName}.controller.ts # REST controller
      {EntityName}.module.ts    # NestJS module
      dtos/
        {EntityName}.dto.ts     # Create/Update DTOs
    guards/                     # Generated when auth or scopeBy is configured
      auth.guard.ts
      scope.guard.ts
      guards.module.ts
      index.ts
    enums/                      # Enum type definitions
    index.ts                    # Root module tying everything together
  extensions/                   # Safe to modify - custom business logic
    {EntityName}/
      {EntityName}.service.ts
      {EntityName}.controller.ts
```

---

## Complete Working Example

A task management API with organizations, projects, and tasks:

```json
{
  "version": 2,
  "rootFolder": "src",
  "language": "typescript",
  "auth": {
    "provider": "better-auth"
  },
  "entities": [
    {
      "name": "Organization",
      "created_at": true,
      "updated_at": true,
      "fields": [
        { "name": "name", "type": "text", "length": 100 },
        { "name": "slug", "type": "text", "length": 50, "unique": true },
        { "name": "billing_email", "type": "text", "length": 255, "is_email": true, "nullable": true }
      ]
    },
    {
      "name": "User",
      "created_at": true,
      "updated_at": true,
      "fields": [
        { "name": "email", "type": "text", "length": 255, "is_email": true },
        { "name": "fullName", "type": "text", "nullable": true },
        { "name": "role", "type": "enum", "values": ["admin", "member", "viewer"], "default": "member" },
        { "name": "status", "type": "enum", "values": ["active", "suspended", "pending"], "default": "pending" }
      ],
      "indexes": [
        { "fields": ["email"], "unique": true }
      ]
    },
    {
      "name": "Project",
      "created_at": true,
      "updated_at": true,
      "scopeBy": "organizationId",
      "fields": [
        { "name": "name", "type": "text", "length": 100 },
        { "name": "description", "type": "text", "nullable": true },
        { "name": "status", "type": "enum", "values": ["active", "archived", "completed"], "default": "active" }
      ],
      "indexes": [
        { "fields": ["organizationId", "name"], "unique": true }
      ]
    },
    {
      "name": "Task",
      "created_at": true,
      "updated_at": true,
      "scopeBy": "organizationId",
      "fields": [
        { "name": "title", "type": "text", "length": 200 },
        { "name": "description", "type": "text", "nullable": true },
        { "name": "status", "type": "enum", "values": ["todo", "in_progress", "done"], "default": "todo" },
        { "name": "priority", "type": "enum", "values": ["low", "medium", "high"], "default": "medium" },
        { "name": "due_date", "type": "date", "nullable": true },
        { "name": "organizationId", "type": "text", "length": 50 }
      ],
      "indexes": [
        { "fields": ["projectId", "status"] }
      ]
    }
  ],
  "relationships": [
    { "from": "Organization", "to": "User", "type": "OneToMany" },
    { "from": "User", "to": "Organization", "type": "ManyToOne" },
    { "from": "Organization", "to": "Project", "type": "OneToMany", "index": true },
    { "from": "Project", "to": "Organization", "type": "ManyToOne" },
    { "from": "Project", "to": "Task", "type": "OneToMany" },
    { "from": "Task", "to": "Project", "type": "ManyToOne" },
    { "from": "Task", "to": "User", "type": "ManyToOne", "to_name": "assignee", "nullable": true }
  ]
}
```

---

## End-to-End Workflow

### New Project (Offline)

```bash
apso init --name my-api --language typescript --skip-platform
cd my-api
# Edit .apsorc with your schema
apso generate
apso dev                    # Starts PostgreSQL + NestJS via Docker Compose
# API available at http://localhost:3001
# Swagger docs at http://localhost:3001/api/docs
```

### New Project (Platform-Linked)

```bash
apso login
apso init --name my-api --language typescript
cd my-api
# Edit .apsorc with your schema
apso generate
apso dev                    # Local development
apso migrate --apply        # Test migrations locally
apso deploy                 # Deploy to AWS (RDS + Lambda + API Gateway)
apso status                 # Check deployment status
apso open                   # Open dashboard in browser
```

### Modify Existing Schema

```bash
# Edit .apsorc (add entities, fields, relationships)
apso generate               # Regenerate code
apso migrate                # Preview migration SQL
apso migrate --apply        # Apply snapshot
apso deploy                 # Deploy changes
```

---

## Template Repositories

`apso init` clones from these templates:

| Language | Repository |
|----------|-----------|
| TypeScript | `https://github.com/apsoai/service-template.git` |
| Python | `https://github.com/apsoai/service-template-python.git` |
| Go | `https://github.com/apsoai/service-template-go.git` |

TypeScript is the primary and fully supported language. Python and Go are in development.
