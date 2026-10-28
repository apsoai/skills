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

The `score` field on Contact is text, but it always holds a whole number. Change it to an integer.

I changed `.apsorc` to this:

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
          "type": "integer",
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

Then I ran `apso migrate`. It saved `.apso/migration-plan.json` and printed:

```json
{
  "status": "questions",
  "plan": ".apso/migration-plan.json",
  "baseline": "deployed.apsorc",
  "open": [
    {
      "id": "cast:Contact.score",
      "kind": "cast",
      "subject": "Field Contact.score changes type from text to integer",
      "options": [
        "cast",
        "sql"
      ],
      "labels": {
        "cast": "Convert each value as it is (fails on values that don't convert)",
        "sql": "Use a SQL expression to convert"
      },
      "sqlHint": "SQL that converts \"score\", e.g. NULLIF(\"score\", '')::integer"
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
  "to": "sha256:808944946466d9fb69d5dff7915dac780b24cf41338bcf98a7d726fb4f5b2681",
  "questions": [
    {
      "id": "cast:Contact.score",
      "kind": "cast",
      "subject": "Field Contact.score changes type from text to integer",
      "options": [
        "cast",
        "sql"
      ]
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
