---
name: soft-delete
description: Add soft delete patterns to a schema. Records are marked as deleted rather than removed, supporting undo, audit trails, and data retention. Triggers on "soft delete", "archive records", "undo delete", "data retention", "trash".
---

# Soft Delete Patterns

Mark records as deleted instead of removing them. Supports undo, data retention policies, and audit compliance.

## Pattern 1: Deleted Timestamp

Add a `deleted_at` field. Null means active, a date means deleted.

```json
{
  "name": "Project",
  "created_at": true,
  "updated_at": true,
  "scopeBy": "organizationId",
  "fields": [
    { "name": "name", "type": "text", "length": 100 },
    { "name": "status", "type": "enum", "values": ["active", "archived"], "default": "active" },
    { "name": "deleted_at", "type": "date", "nullable": true, "index": true }
  ],
  "indexes": [
    { "fields": ["organizationId", "deleted_at"] }
  ]
}
```

Queries filter with `WHERE deleted_at IS NULL` to show only active records. Add `deleted_at IS NOT NULL` for a trash view.

**When to use:** The standard approach. Simple, well-understood, works with existing query patterns.

## Pattern 2: Status Enum with Archive

Use a status field that includes `deleted` or `archived` as a value.

```json
{
  "name": "Document",
  "created_at": true,
  "updated_at": true,
  "scopeBy": "organizationId",
  "fields": [
    { "name": "title", "type": "text", "length": 200 },
    { "name": "status", "type": "enum", "values": ["draft", "published", "archived", "deleted"], "default": "draft" }
  ],
  "indexes": [
    { "fields": ["organizationId", "status"] }
  ]
}
```

**When to use:** When the entity already has a status field and "deleted" is one logical state among several.

## Pattern 3: Soft Delete with Retention

Track who deleted and when, with a retention period for permanent cleanup.

```json
{
  "name": "Customer",
  "created_at": true,
  "updated_at": true,
  "scopeBy": "organizationId",
  "fields": [
    { "name": "name", "type": "text", "length": 100 },
    { "name": "email", "type": "text", "length": 255, "is_email": true },
    { "name": "deleted_at", "type": "date", "nullable": true },
    { "name": "deletedReason", "type": "text", "nullable": true },
    { "name": "retainUntil", "type": "date", "nullable": true }
  ]
}
```

A background job permanently deletes records where `retainUntil < now()`.

**When to use:** GDPR compliance, financial data retention requirements, or any domain where "permanently delete after 90 days" is a policy.

## Pattern 4: Archive Table

Move deleted records to a separate archive entity instead of flagging them.

```json
{
  "entities": [
    {
      "name": "Project",
      "created_at": true,
      "updated_at": true,
      "scopeBy": "organizationId",
      "fields": [
        { "name": "name", "type": "text", "length": 100 },
        { "name": "status", "type": "enum", "values": ["active", "completed"], "default": "active" }
      ]
    },
    {
      "name": "ProjectArchive",
      "created_at": true,
      "scopeBy": "organizationId",
      "fields": [
        { "name": "originalId", "type": "text", "length": 50 },
        { "name": "name", "type": "text", "length": 100 },
        { "name": "status", "type": "text", "length": 20 },
        { "name": "snapshot", "type": "json-plain" },
        { "name": "archivedAt", "type": "date" },
        { "name": "archiveReason", "type": "text", "nullable": true }
      ],
      "indexes": [
        { "fields": ["organizationId", "originalId"] }
      ]
    }
  ],
  "relationships": [
    { "from": "ProjectArchive", "to": "User", "type": "ManyToOne", "to_name": "archivedBy" }
  ]
}
```

The `snapshot` field stores the full record as JSON at the time of archival.

**When to use:** When you want to keep the main table lean and fast. Active queries never touch archived data. Good for high-volume tables.

## Choosing the Right Pattern

| Need | Pattern | Complexity |
|------|---------|-----------|
| Simple undo / undelete | Deleted Timestamp | Low |
| Delete is one of several states | Status Enum | Low |
| Compliance with retention period | Soft Delete + Retention | Medium |
| Keep main table fast at scale | Archive Table | Medium |

## Index Considerations

Always index the soft delete field for query performance:

```json
"indexes": [
  { "fields": ["organizationId", "deleted_at"] },
  { "fields": ["deleted_at"] }
]
```

Without this index, every query that filters active records does a full table scan.
