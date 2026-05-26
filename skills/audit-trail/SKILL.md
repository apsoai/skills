---
name: audit-trail
description: Add audit logging and change tracking to a schema. Tracks who created, updated, or deleted records and maintains a change history. Triggers on "add audit trail", "track changes", "who changed what", "change history", "activity log".
---

# Audit Trail Patterns

Track who did what and when. From simple timestamp fields to full change history with diffs.

## Pattern 1: Timestamp Fields (Baseline)

Every entity should have `created_at` and `updated_at`. These are built-in.

```json
{
  "name": "Project",
  "created_at": true,
  "updated_at": true,
  "fields": [...]
}
```

This generates `created_at` and `updated_at` columns managed automatically by the ORM.

## Pattern 2: Created/Updated By

Track which user made changes. Add `createdBy` and `updatedBy` relationships to your entities.

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
        { "name": "status", "type": "enum", "values": ["active", "archived"], "default": "active" }
      ]
    }
  ],
  "relationships": [
    { "from": "Project", "to": "User", "type": "ManyToOne", "to_name": "createdBy" },
    { "from": "Project", "to": "User", "type": "ManyToOne", "to_name": "updatedBy", "nullable": true }
  ]
}
```

**When to use:** When you need to show "Created by Jane, last updated by Bob" in the UI. Low overhead, no extra tables.

## Pattern 3: Activity Log

A dedicated entity that records every significant action in the system.

```json
{
  "entities": [
    {
      "name": "ActivityLog",
      "created_at": true,
      "scopeBy": "organizationId",
      "scopeOptions": {
        "enforceOn": ["find", "get"],
        "injectOnCreate": true
      },
      "fields": [
        { "name": "action", "type": "enum", "values": ["create", "update", "delete", "archive", "restore", "assign", "invite", "login"] },
        { "name": "entityType", "type": "text", "length": 50 },
        { "name": "entityId", "type": "text", "length": 50 },
        { "name": "description", "type": "text", "nullable": true },
        { "name": "metadata", "type": "json-plain", "nullable": true },
        { "name": "ipAddress", "type": "text", "length": 45, "nullable": true }
      ],
      "indexes": [
        { "fields": ["organizationId", "entityType", "entityId"] },
        { "fields": ["organizationId", "created_at"] },
        { "fields": ["organizationId", "action"] }
      ]
    }
  ],
  "relationships": [
    { "from": "ActivityLog", "to": "User", "type": "ManyToOne", "to_name": "actor" },
    { "from": "Organization", "to": "ActivityLog", "type": "OneToMany" },
    { "from": "ActivityLog", "to": "Organization", "type": "ManyToOne" }
  ]
}
```

The `metadata` field stores action-specific context as JSON:
```json
{
  "previousStatus": "active",
  "newStatus": "archived",
  "reason": "Project completed"
}
```

**When to use:** Compliance requirements, admin dashboards, "activity feed" features.

## Pattern 4: Change History with Diffs

Track exact field-level changes for critical entities.

```json
{
  "entities": [
    {
      "name": "ChangeRecord",
      "created_at": true,
      "scopeBy": "organizationId",
      "fields": [
        { "name": "entityType", "type": "text", "length": 50 },
        { "name": "entityId", "type": "text", "length": 50 },
        { "name": "fieldName", "type": "text", "length": 50 },
        { "name": "oldValue", "type": "text", "nullable": true },
        { "name": "newValue", "type": "text", "nullable": true },
        { "name": "changeType", "type": "enum", "values": ["create", "update", "delete"] }
      ],
      "indexes": [
        { "fields": ["entityType", "entityId", "created_at"] },
        { "fields": ["organizationId", "created_at"] }
      ]
    }
  ],
  "relationships": [
    { "from": "ChangeRecord", "to": "User", "type": "ManyToOne", "to_name": "changedBy" },
    { "from": "Organization", "to": "ChangeRecord", "type": "OneToMany" },
    { "from": "ChangeRecord", "to": "Organization", "type": "ManyToOne" }
  ]
}
```

**When to use:** Regulated industries, financial apps, anything where "show me exactly what changed" is a requirement.

## Choosing the Right Pattern

| Need | Pattern | Storage Cost |
|------|---------|-------------|
| "When was this created/updated?" | Timestamps (Pattern 1) | Zero extra tables |
| "Who created/updated this?" | CreatedBy/UpdatedBy (Pattern 2) | Zero extra tables, 2 FK columns |
| "What happened in this organization?" | Activity Log (Pattern 3) | 1 extra table, 1 row per action |
| "What exactly changed in this field?" | Change History (Pattern 4) | 1 extra table, 1 row per field change |

Start with Pattern 1 (always) and Pattern 2 (usually). Add Pattern 3 or 4 only when you have a specific use case.
