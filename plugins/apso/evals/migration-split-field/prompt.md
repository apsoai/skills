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

Split Contact.fullName into firstName and lastName. lastName is optional, since some contacts go by one name.

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
          "name": "firstName",
          "type": "text"
        },
        {
          "name": "lastName",
          "type": "text",
          "nullable": true
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

Then I ran `apso migrate`. It saved `.apso/migration-plan.json` and printed:

```json
{
  "status": "questions",
  "plan": ".apso/migration-plan.json",
  "baseline": "deployed.apsorc",
  "open": [
    {
      "id": "field:Contact.fullName",
      "kind": "removedField",
      "subject": "Field Contact.fullName (text) is gone",
      "options": [
        "rename:firstName",
        "rename:lastName",
        "split:firstName,lastName",
        "drop"
      ],
      "labels": {
        "rename:firstName": "Renamed to firstName (keeps the data)",
        "rename:lastName": "Renamed to lastName (keeps the data)",
        "split:firstName,lastName": "Split into firstName and lastName (you give the rule)",
        "drop": "Dropped (deletes its data)"
      },
      "splitDefaults": {
        "split:firstName,lastName": {
          "firstName": "split_part(btrim(\"fullName\"), ' ', 1)",
          "lastName": "NULLIF(btrim(substr(btrim(\"fullName\"), length(split_part(btrim(\"fullName\"), ' ', 1)) + 1)), '')"
        }
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
  "to": "sha256:0a1af8b4ce652846698ac6ea489fed54c55af3f0181e6aa7d4e71f97813c6b44",
  "questions": [
    {
      "id": "field:Contact.fullName",
      "kind": "removedField",
      "subject": "Field Contact.fullName (text) is gone",
      "options": [
        "rename:firstName",
        "rename:lastName",
        "split:firstName,lastName",
        "drop"
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
