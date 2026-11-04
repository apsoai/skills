Review this Apso schema for a document-management app before we deploy it. Folders nest; folder names must be unique within their parent. We record an audit event for every API call, a few million a day across customers. The documents screen lists an organization's documents newest first. List concrete fixes.

```json
{
  "version": 2,
  "rootFolder": "src",
  "apiType": "Rest",
  "entities": [
    { "name": "Organization", "primaryKeyType": "uuid", "created_at": true, "updated_at": true,
      "fields": [{ "name": "name", "type": "text" }] },
    { "name": "Folder", "primaryKeyType": "uuid", "created_at": true, "updated_at": true, "scopeBy": "organizationId",
      "fields": [{ "name": "name", "type": "text" }],
      "uniques": [{ "fields": ["organizationId", "parentId", "name"] }] },
    { "name": "Document", "primaryKeyType": "uuid", "created_at": true, "updated_at": true, "scopeBy": "organizationId",
      "fields": [
        { "name": "title", "type": "text" },
        { "name": "slug", "type": "text" },
        { "name": "isPinned", "type": "boolean", "default": "false", "index": true }
      ],
      "uniques": [{ "fields": ["organizationId", "slug"] }],
      "indexes": [{ "fields": ["created_at", "organizationId"] }] },
    { "name": "AuditEvent", "created_at": true, "scopeBy": "organizationId",
      "fields": [
        { "name": "action", "type": "text" },
        { "name": "payload", "type": "json" }
      ] }
  ],
  "relationships": [
    { "from": "Folder", "to": "Organization", "type": "ManyToOne", "index": true },
    { "from": "Folder", "to": "Folder", "type": "ManyToOne", "to_name": "parent", "nullable": true, "index": true },
    { "from": "Document", "to": "Organization", "type": "ManyToOne", "index": true },
    { "from": "Document", "to": "Folder", "type": "ManyToOne", "index": true, "cascadeDelete": true },
    { "from": "AuditEvent", "to": "Organization", "type": "ManyToOne", "index": true }
  ]
}
```
