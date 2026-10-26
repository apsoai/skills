My Apso service (TypeScript) is deployed and its database holds production data. This is the current `.apsorc`:

```json
{
  "version": 2,
  "rootFolder": "src",
  "apiType": "Rest",
  "entities": [
    {
      "name": "Company",
      "created_at": true,
      "updated_at": true,
      "fields": [
        {
          "name": "name",
          "type": "text"
        }
      ]
    },
    {
      "name": "Contact",
      "created_at": true,
      "updated_at": true,
      "fields": [
        {
          "name": "fullName",
          "type": "text"
        },
        {
          "name": "phone",
          "type": "varchar",
          "length": 40,
          "nullable": true
        },
        {
          "name": "status",
          "type": "enum",
          "values": [
            "lead",
            "active",
            "archived"
          ],
          "default": "lead"
        },
        {
          "name": "score",
          "type": "text",
          "nullable": true
        }
      ]
    }
  ],
  "relationships": [
    {
      "from": "Contact",
      "to": "Company",
      "type": "ManyToOne",
      "index": true
    }
  ]
}
```

Replace the `archived` status on Contact with `closed`. Contacts that are archived today should become closed.

Update `.apsorc` and write the migration that carries the change to the database. Write the updated schema to `.apsorc` and the migration file into the project, then print both files.
