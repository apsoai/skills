---
name: schema-designer
description: Design a database schema from application requirements. Takes entity descriptions, relationships, and business rules and produces a validated schema definition. Triggers on "design schema", "create data model", "define entities", "plan database".
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
- Define both sides when needed
- Use `to_name` when an entity has multiple relationships to the same target
- Add `index: true` on frequently queried foreign keys

### Step 4: Add Multi-Tenancy

Business entities get `scopeBy` pointing to the tenant identifier (usually `organizationId`). This generates guards that automatically filter queries, verify access, and inject scope values on create.

Exceptions: the Organization entity itself, global lookup tables, and auth entities.

### Step 5: Add Indexes

Add composite indexes for common query patterns:

```json
"indexes": [
  { "fields": ["organizationId", "status"] },
  { "fields": ["organizationId", "name"], "unique": true }
]
```

## Schema Format Reference

Read `references/apso-schema-guide.md` for the complete field type table, relationship patterns, auth configuration, and working examples.

### Quick Reference

**Field types:** `text`, `integer`, `float`, `decimal`, `numeric`, `boolean`, `date`, `enum`, `json`, `json-plain`, `array`

**Common mistakes:**
- `"string"` is wrong. Use `"text"`.
- `"uuid"` is not a field type. Use `"primaryKeyType": "uuid"` on the entity.
- `"timestamp"` is not a field type. Use `"date"`, or `"created_at": true` on the entity.
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
    { "from": "Organization", "to": "Project", "type": "OneToMany" },
    { "from": "Project", "to": "Organization", "type": "ManyToOne" }
  ]
}
```

## Related Skills

- `multi-tenancy` — Patterns for tenant data isolation
- `auth-entities` — Authentication entity patterns
- `audit-trail` — Track who changed what and when
- `billing-subscription` — Stripe-compatible billing schemas
