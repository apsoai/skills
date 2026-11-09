---
name: schema-designer
category: data
description: Design a database schema or data model from application requirements. Takes entity descriptions, relationships, and business rules and produces a validated .apsorc schema. Use whenever the user asks to design, model or plan the data, tables, entities or database for an app or feature (billing, CRM, invoicing, case management, anything), even when another domain skill also applies. Triggers on "design schema", "data model", "design the data model", "create data model", "define entities", "plan database", "database design".
---

# Schema Designer

Design database schemas from application requirements. Takes a description of what your application manages and produces a complete, validated schema ready for code generation.

## What You Get

A `.apsorc` schema file with:
- Entity definitions with correct field types and constraints
- Relationships between entities (one-to-many, many-to-many, etc.)
- Multi-tenancy via `scopeBy` for tenant-isolated data
- Composite indexes for query performance
- Validation rules (unique, nullable, defaults, enums)

## Working Efficiently

Read `${CLAUDE_PLUGIN_ROOT}/references/schema-design-quick.md` first, and for a new schema read nothing else unless a requirement needs a pattern it doesn't cover. It has the file shape, the column names Apso generates, field types, relationships, tenancy and index rules. Every file read is paid for again on each later turn, so:

- Don't search the project for an existing `.apsorc` when the task is a new design.
- Design the whole schema in one pass, run the checks in "Before writing" in the quick reference, and write `.apsorc` once. Don't print it back, re-read it, or rewrite it unless a check failed.

## Design Principles

Normalize to 3NF, model interactions (likes, views, follows) as **event entities, not counters**, use junction entities for many-to-many links that carry data, and index for the queries the screens run. For a deeper audit of an existing schema, use the `schema-review` skill.

For patterns the quick reference doesn't cover (trees with ordering, subtypes, versioned rows, effective dates, custom fields, per-tenant numbering), read the matching entry in `${CLAUDE_PLUGIN_ROOT}/references/relational-patterns.md`. Each entry gives the Postgres design and its `.apsorc` encoding. When a pattern needs a guarantee `.apsorc` cannot express (a `CHECK`, a partial unique index, overlap prevention), encode the closest form and tell the user which guarantee is missing and where to enforce it.

## How I Work

### Step 1: Identify Entities

Map the nouns in your requirements to entities. Each entity becomes a database table and a REST API endpoint.

**Example:** "Users belong to organizations and create projects with tasks"
- `Organization` (tenant root)
- `User` (belongs to org)
- `Project` (scoped to org)
- `Task` (scoped to org, belongs to project)

### Step 2: Define Fields

For each entity, determine:
- What data to track (fields with correct types)
- What is required vs optional (`nullable: true`)
- What must be unique (`unique: true`)
- What needs defaults (`default`)
- What is an enumerated set (`type: "enum"` with `values`)

### Step 3: Map Relationships

For each entity pair:
- Determine cardinality (one-to-many, many-to-many, etc.)
- Declare each relationship once, as a `ManyToOne` from the child to the parent. Apso generates the inverse collection on the parent. Do not also declare the `OneToMany`: a second declaration is redundant, and when the two name the collection differently (a `to_name` on the OneToMany), the parent gets two collections for the same foreign key.
- A self-reference (tree) is one `ManyToOne` with `to_name: "parent"` and `nullable: true`. Do not add a `children` OneToMany.
- Use `to_name` when an entity has multiple relationships to the same target
- Set `"index": true` on every `ManyToOne`. Apso does not index foreign keys on its own. Skip it only when an `indexes` or `uniques` entry already starts with that foreign key column; a second index on the same leading column is a duplicate that every insert pays for.

### Step 4: Add Multi-Tenancy

Business entities get `scopeBy` pointing to the tenant identifier (usually `organizationId`). This generates guards that automatically filter queries, verify access, and inject scope values on create.

Every entity that holds tenant data is scoped, including children such as comments, line items, and attachments. Each one has its own tenant column, through a many-to-one relationship to the tenant or a plain field. Never scope through a parent with a dot path such as `task.organizationId`.

Exceptions: the Organization entity itself, global lookup tables, and auth entities. For retrofits, shared rows or cross-tenant admin access, see `${CLAUDE_PLUGIN_ROOT}/references/tenant-scoping.md`.

### Step 5: Add Indexes

Derive indexes from the queries the app will run, not from the columns. For each list or lookup: equality columns first (count the `scopeBy` tenant filter as one), then the one range or ORDER BY column. A board that shows one project's tasks in one status by due date needs `["projectId", "status", "dueDate"]`. Don't index a boolean or a few-valued status on its own, don't repeat an index another index or unique already starts with, and don't add an index no query uses.

```json
"indexes": [
  { "fields": ["organizationId", "status"] },
  { "fields": ["organizationId", "name"], "unique": true }
]
```

### Step 6: Validate

If the Apso CLI is available, run `apso schema validate --local` in the project folder. Fix every error, and every `FOREIGN_KEY_NOT_INDEXED` warning, except one on a foreign key that already leads a `uniques` entry (that unique index covers it; older linters don't count uniques). Other warnings can stay when there is a reason (for example `MISSING_TIMESTAMPS` on append-only rows).

## Schema Format Reference

The quick reference covers what a new design needs. `${CLAUDE_PLUGIN_ROOT}/references/apso-schema-guide.md` is the complete format, including auth configuration and scope options.

### Quick Reference

**Field types:** `text`, `varchar`, `integer`, `float`, `decimal`, `numeric`, `boolean`, `date`, `timestamptz`, `timestamp`, `enum`, `json`, `uuid`. Store lists as `json`: `apso migrate` can't write `array` yet.

**Picking a type:**
- Moments in time (`paidAt`, `expiresAt`, `scheduledFor`) are `timestamptz`. `date` stores a calendar day with no time, so use it only for things like `birthDate` or `dueDate`.
- `text` has no length limit. `varchar` defaults to 255 characters, so use it only with a known short limit, and never for descriptions, notes or bodies.
- Money is `decimal` with `precision` and `scale`, never `float`.
- `json` is stored as `jsonb`. Use it for loose attributes, not for data you filter or join on.

**Common mistakes:**
- The primary key is set with `"primaryKeyType": "uuid"` on the entity, not with a `uuid` field. A `uuid` field is only for a UUID that comes from somewhere else.
- `created_at` and `updated_at` come from `"created_at": true` and `"updated_at": true` on the entity, not from fields.
- `"required": true` is not a field property. Fields are required by default. Use `"nullable": true` to make optional.

**Relationship types:** `OneToMany`, `ManyToOne`, `ManyToMany`, `OneToOne`

### Example Output

```json
{
  "version": 2,
  "rootFolder": "src",
  "language": "typescript",
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
      "created_at": true,
      "updated_at": true,
      "scopeBy": "organizationId",
      "fields": [
        { "name": "name", "type": "text", "length": 100 },
        { "name": "status", "type": "enum", "values": ["active", "archived"], "default": "active" }
      ],
      "indexes": [
        { "fields": ["organizationId", "name"], "unique": true }
      ]
    }
  ],
  "relationships": [
    {"from": "Project", "to": "Organization", "type": "ManyToOne", "index": true}
  ]
}
```

## Related Skills

- `schema-review` — Audit an existing schema for normalization, indexing, and scale
- `schema-migration` — Change the schema of a deployed service without losing data
- `multi-tenancy` — Patterns for tenant data isolation
- `auth-entities` — Authentication entity patterns
- `audit-trail` — Track who changed what and when
- `billing-subscription` — Stripe-compatible billing schemas
