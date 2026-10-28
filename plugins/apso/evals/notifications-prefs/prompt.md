Add in-app notifications with read/unread state, plus per-user preferences for which notification types also go to email. Write the updated schema to `.apsorc` in the current directory, then print the final file contents.

Current schema:

```json
{
  "version": 2,
  "rootFolder": "src",
  "apiType": "Rest",
  "entities": [
    {
      "name": "Organization",
      "created_at": true,
      "updated_at": true,
      "fields": [
        {
          "name": "name",
          "type": "text",
          "length": 100
        }
      ]
    },
    {
      "name": "User",
      "created_at": true,
      "updated_at": true,
      "fields": [
        {
          "name": "email",
          "type": "text",
          "length": 255,
          "is_email": true,
          "unique": true
        }
      ]
    },
    {
      "name": "Project",
      "scopeBy": "organizationId",
      "created_at": true,
      "updated_at": true,
      "fields": [
        {
          "name": "name",
          "type": "text",
          "length": 100
        }
      ]
    },
    {
      "name": "Task",
      "scopeBy": "organizationId",
      "created_at": true,
      "updated_at": true,
      "fields": [
        {
          "name": "title",
          "type": "text",
          "length": 200
        },
        {
          "name": "status",
          "type": "enum",
          "values": [
            "todo",
            "done"
          ],
          "default": "todo"
        }
      ]
    }
  ],
  "relationships": [
    {
      "from": "Project",
      "to": "Organization",
      "type": "ManyToOne"
    },
    {
      "from": "Task",
      "to": "Project",
      "type": "ManyToOne"
    }
  ]
}
```
