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

A contact can now work with several companies. Change the Contact to Company relationship from many-to-one to many-to-many.

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
      "type": "ManyToMany",
      "bi_directional": true
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
      "id": "relation:Contact.Company",
      "kind": "relation",
      "subject": "Contact ManyToOne Company becomes ManyToMany",
      "options": [
        "copy-links",
        "drop-links"
      ],
      "labels": {
        "copy-links": "Copy each existing link into the new join table",
        "drop-links": "Start with no links (deletes them)"
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
  "to": "sha256:2c207b21a70a00e780c39e48383d08b10a880ee731671dd751c0c9c8b1a443a2",
  "questions": [
    {
      "id": "relation:Contact.Company",
      "kind": "relation",
      "subject": "Contact ManyToOne Company becomes ManyToMany",
      "options": [
        "copy-links",
        "drop-links"
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
