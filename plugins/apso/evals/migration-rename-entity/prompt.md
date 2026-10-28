My Apso service (TypeScript) is deployed and its database holds production data. This is the deployed `.apsorc`:

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

Rename the Company entity to Organization, including everything that points at it.

I changed `.apsorc` to this:

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
      "to": "Organization",
      "type": "ManyToOne",
      "index": true
    }
  ]
}
```

Then I ran `apso migrate`. It saved `.apso/migration-plan.json` and printed:

```json
{
  "status": "questions",
  "plan": ".apso/migration-plan.json",
  "baseline": "deployed.apsorc",
  "open": [
    {
      "id": "entity:Company",
      "kind": "removedEntity",
      "subject": "Entity Company is gone",
      "options": [
        "rename:Organization",
        "drop"
      ],
      "suggested": "rename:Organization",
      "labels": {
        "rename:Organization": "Renamed to Organization (keeps its rows) (suggested)",
        "drop": "Dropped (deletes its rows)"
      }
    }
  ],
  "next": "Rerun apso migrate --answer <id>=<option> for each. For \"sql\" and \"split:\" answers, also set the question's \"sql\" in the plan file: a string, or one expression per split field."
}
```

This is `.apso/migration-plan.json`:

```json
{
  "version": 1,
  "from": "sha256:420e1c3e50d1390f936be4978f4da8e3f87ba6eb834d94ce95be401f44e00d65",
  "to": "sha256:a8b68a5fb11842c7f5a158d41a5dd3d2480130422f1007386315e15827292811",
  "questions": [
    {
      "id": "entity:Company",
      "kind": "removedEntity",
      "subject": "Entity Company is gone",
      "options": [
        "rename:Organization",
        "drop"
      ],
      "suggested": "rename:Organization"
    }
  ],
  "before": {
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
}
```

Get this ready to deploy. Write `.apsorc` and the answered `.apso/migration-plan.json` into the project so I can run `apso migrate` again, and tell me what happens to the existing rows.
