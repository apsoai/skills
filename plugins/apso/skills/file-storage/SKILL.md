---
name: file-storage
description: Add file upload and attachment entities to a schema. S3 references, metadata, thumbnails, and file associations. Triggers on "file uploads", "attachments", "media storage", "image uploads", "document storage".
---

# File Storage Patterns

Model file uploads, attachments, and media references. Files are stored in S3 (or compatible). The database tracks metadata and references.

## Pattern 1: Generic Attachment

A polymorphic attachment entity that can be linked to any other entity.

```json
{
  "entities": [
    {
      "name": "Attachment",
      "created_at": true,
      "scopeBy": "organizationId",
      "fields": [
        { "name": "fileName", "type": "text", "length": 255 },
        { "name": "fileKey", "type": "text", "length": 500 },
        { "name": "fileUrl", "type": "text", "length": 1000 },
        { "name": "mimeType", "type": "text", "length": 100 },
        { "name": "fileSize", "type": "integer" },
        { "name": "entityType", "type": "text", "length": 50 },
        { "name": "entityId", "type": "text", "length": 50 },
        { "name": "thumbnailUrl", "type": "text", "length": 1000, "nullable": true },
        { "name": "metadata", "type": "json-plain", "nullable": true }
      ],
      "indexes": [
        { "fields": ["entityType", "entityId"] },
        { "fields": ["organizationId", "created_at"] }
      ]
    }
  ],
  "relationships": [
    { "from": "Attachment", "to": "User", "type": "ManyToOne", "to_name": "uploadedBy" },
    { "from": "Organization", "to": "Attachment", "type": "OneToMany" },
    { "from": "Attachment", "to": "Organization", "type": "ManyToOne" }
  ]
}
```

`fileKey` is the S3 object key. `fileUrl` is the CDN or presigned URL. `entityType` + `entityId` link the attachment to any record (project, task, message, etc.).

**When to use:** Apps where multiple entity types can have attachments. Avoids creating separate attachment tables per entity.

## Pattern 2: Direct Relationship Attachments

When files belong to a specific entity, use a direct relationship instead of polymorphic linking.

```json
{
  "entities": [
    {
      "name": "ProjectFile",
      "created_at": true,
      "scopeBy": "organizationId",
      "fields": [
        { "name": "fileName", "type": "text", "length": 255 },
        { "name": "fileKey", "type": "text", "length": 500 },
        { "name": "fileUrl", "type": "text", "length": 1000 },
        { "name": "mimeType", "type": "text", "length": 100 },
        { "name": "fileSize", "type": "integer" },
        { "name": "category", "type": "enum", "values": ["document", "image", "video", "other"], "default": "other" }
      ]
    }
  ],
  "relationships": [
    { "from": "Project", "to": "ProjectFile", "type": "OneToMany" },
    { "from": "ProjectFile", "to": "Project", "type": "ManyToOne" },
    { "from": "ProjectFile", "to": "User", "type": "ManyToOne", "to_name": "uploadedBy" }
  ]
}
```

**When to use:** When files are tightly coupled to one entity type. Gives you stronger typing and simpler queries.

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
| Any entity can have attachments | Generic Attachment (Pattern 1) |
| Files belong to one entity type | Direct Relationship (Pattern 2) |
| Single image per record | Field on entity (Pattern 3) |
