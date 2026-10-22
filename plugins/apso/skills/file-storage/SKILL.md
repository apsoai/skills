---
name: file-storage
category: integrations
description: Add file upload and attachment entities to a schema. S3 references, metadata, thumbnails, and file associations. Triggers on "file uploads", "attachments", "media storage", "image uploads", "document storage".
---

# File Storage Patterns

Model file uploads, attachments, and media references. Files are stored in S3 (or compatible). The database tracks metadata and a real foreign key to the record that owns each file.

## Pattern 1: Files Owned by One Entity Type

When files belong to one kind of record, give the file entity a real foreign key to it. This is the default.

```json
{
  "entities": [
    {
      "name": "ProjectFile",
      "created_at": true,
      "scopeBy": "organizationId",
      "fields": [
        { "name": "fileName", "type": "text" },
        { "name": "fileKey", "type": "text" },
        { "name": "mimeType", "type": "varchar", "length": 100 },
        { "name": "fileSize", "type": "integer" },
        { "name": "category", "type": "enum", "values": ["document", "image", "video", "other"], "default": "other" },
        { "name": "metadata", "type": "json", "nullable": true }
      ],
      "uniques": [{ "fields": ["fileKey"] }]
    }
  ],
  "relationships": [
    { "from": "ProjectFile", "to": "Project", "type": "ManyToOne", "index": true, "cascadeDelete": true },
    { "from": "ProjectFile", "to": "User", "type": "ManyToOne", "to_name": "uploadedBy" },
    { "from": "ProjectFile", "to": "Organization", "type": "ManyToOne" }
  ]
}
```

`fileKey` is the S3 object key. Generate the download URL from it at read time (presigned or CDN) instead of storing a URL that can expire. `cascadeDelete` removes the file rows with the project; delete the S3 objects in the same handler.

**When to use:** Almost always. The database guarantees every file points at a project that exists.

## Pattern 2: One File Table, Several Owner Types

When a few entity types (for example Project, Task and Message) all take attachments, keep one `Attachment` table and give it one nullable foreign key per owner type. Exactly one of them is set on each row.

```json
{
  "entities": [
    {
      "name": "Attachment",
      "created_at": true,
      "scopeBy": "organizationId",
      "fields": [
        { "name": "fileName", "type": "text" },
        { "name": "fileKey", "type": "text" },
        { "name": "mimeType", "type": "varchar", "length": 100 },
        { "name": "fileSize", "type": "integer" },
        { "name": "metadata", "type": "json", "nullable": true }
      ],
      "uniques": [{ "fields": ["fileKey"] }]
    }
  ],
  "relationships": [
    { "from": "Attachment", "to": "Project", "type": "ManyToOne", "nullable": true, "index": true, "cascadeDelete": true },
    { "from": "Attachment", "to": "Task", "type": "ManyToOne", "nullable": true, "index": true, "cascadeDelete": true },
    { "from": "Attachment", "to": "Message", "type": "ManyToOne", "nullable": true, "index": true, "cascadeDelete": true },
    { "from": "Attachment", "to": "User", "type": "ManyToOne", "to_name": "uploadedBy" },
    { "from": "Attachment", "to": "Organization", "type": "ManyToOne" }
  ]
}
```

This is an exclusive arc. Every reference is a real foreign key, so deleting a task removes its attachments and no row can point at a missing record. Postgres would enforce "exactly one owner" with a `CHECK` constraint, but `.apsorc` cannot express one, so validate it in the create and update handlers (see the custom-endpoints skill).

**When to use:** Two to about five owner types. Adding an owner type later is one new nullable relationship.

## Avoid: `entityType` + `entityId` Columns

A common shortcut stores the owner as two text columns, `entityType: "task"` and `entityId: "123"`. Do not use it as the default. Postgres cannot put a foreign key on it, so:

- Deleting the task leaves orphaned attachment rows and S3 objects.
- A typo in `entityType` or a stale `entityId` is accepted silently.
- You cannot join from an attachment to its owner in one query.

Use it only when owner types are open-ended (users or plugins define new ones at runtime) and you accept cleaning up orphans with a scheduled job. Say so explicitly when you choose it.

## Pattern 3: Avatar / Profile Image

A single image field on an entity, not a separate table.

```json
{
  "name": "User",
  "fields": [
    { "name": "email", "type": "text", "length": 255, "is_email": true },
    { "name": "name", "type": "text", "length": 100 },
    { "name": "avatar_url", "type": "text", "nullable": true },
    { "name": "avatar_key", "type": "text", "nullable": true }
  ]
}
```

No extra table needed. Store the URL directly on the entity. Use `avatar_key` to manage S3 lifecycle (delete old avatar when new one is uploaded).

**When to use:** Profile pictures, logos, cover images. One image per record.

## Storage Metadata

The `metadata` JSON field stores file-specific data:

```json
{
  "width": 1920,
  "height": 1080,
  "duration": 120,
  "pages": 15,
  "checksum": "sha256:abc123..."
}
```

Useful for image dimensions (responsive display), video duration (playback UI), PDF page count (preview), and integrity verification.

## Choosing the Right Pattern

| Need | Pattern |
|------|---------|
| Files belong to one entity type | Owned by one type (Pattern 1) |
| A few entity types take attachments | Exclusive arc (Pattern 2) |
| Single image per record | Field on entity (Pattern 3) |
