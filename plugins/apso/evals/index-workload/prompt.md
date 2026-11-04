Our Apso task tracker is about to go from a pilot to a few hundred companies, and we expect around 10 million tasks. Review the indexes in this `.apsorc`: make sure the queries below stay fast at that size, and remove indexes that cost writes without helping any of them. Then write the full updated schema to `.apsorc` in the current folder.

```json
{
  "version": 2,
  "rootFolder": "src",
  "apiType": "Rest",
  "entities": [
    { "name": "Organization", "primaryKeyType": "uuid", "created_at": true, "updated_at": true,
      "fields": [{ "name": "name", "type": "text" }] },
    { "name": "User", "primaryKeyType": "uuid", "created_at": true, "updated_at": true, "scopeBy": "organizationId",
      "fields": [
        { "name": "email", "type": "text", "is_email": true },
        { "name": "name", "type": "text" },
        { "name": "isActive", "type": "boolean", "default": "true", "index": true }
      ],
      "uniques": [{ "fields": ["organizationId", "email"] }],
      "indexes": [{ "fields": ["organizationId", "email"] }] },
    { "name": "Project", "primaryKeyType": "uuid", "created_at": true, "updated_at": true, "scopeBy": "organizationId",
      "fields": [
        { "name": "name", "type": "text" },
        { "name": "status", "type": "enum", "values": ["active", "archived"], "default": "active" }
      ] },
    { "name": "Task", "primaryKeyType": "uuid", "created_at": true, "updated_at": true, "scopeBy": "organizationId",
      "fields": [
        { "name": "title", "type": "text" },
        { "name": "status", "type": "enum", "values": ["todo", "in_progress", "done"], "default": "todo" },
        { "name": "dueDate", "type": "date", "nullable": true },
        { "name": "isFlagged", "type": "boolean", "default": "false", "index": true }
      ],
      "indexes": [{ "fields": ["projectId"] }] }
  ],
  "relationships": [
    { "from": "User", "to": "Organization", "type": "ManyToOne", "index": true },
    { "from": "Project", "to": "Organization", "type": "ManyToOne", "index": true },
    { "from": "Task", "to": "Organization", "type": "ManyToOne", "index": true },
    { "from": "Task", "to": "Project", "type": "ManyToOne", "index": true, "cascadeDelete": true },
    { "from": "Task", "to": "User", "type": "ManyToOne", "to_name": "assignee", "nullable": true }
  ]
}
```

The API runs these queries most. Every entity is scoped, so each query also filters on the caller's `organizationId`.

1. Project board: one project's tasks in one status, ordered by due date, 50 at a time.
2. "My tasks": the tasks assigned to the current user, latest due date first, 20 at a time.
3. Sign-in: find a user by email within an organization.
4. Activity feed: the organization's tasks created in the last 7 days, newest first.
5. Project list: the organization's active projects, ordered by name.
