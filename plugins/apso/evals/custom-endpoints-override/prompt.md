NestJS Apso project. I need (1) `POST /projects/:id/archive`, and (2) to REPLACE the generated `GET /tasks` endpoint with my own response shape. Write the files into the project (the controllers, services and any `.apsorc` change), then explain what you did.

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
