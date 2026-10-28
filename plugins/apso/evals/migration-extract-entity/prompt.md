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

Contacts need more than one phone number (mobile, work, home). Move phone into its own PhoneNumber entity that belongs to Contact.

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
    },
    {
      "name": "PhoneNumber",
      "created_at": true,
      "updated_at": true,
      "fields": [
        {
          "name": "number",
          "type": "varchar",
          "length": 40
        },
        {
          "name": "label",
          "type": "enum",
          "values": [
            "mobile",
            "work",
            "home"
          ],
          "default": "mobile"
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
    },
    {
      "from": "PhoneNumber",
      "to": "Contact",
      "type": "ManyToOne",
      "index": true,
      "cascadeDelete": true
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
      "id": "field:Contact.phone",
      "kind": "removedField",
      "subject": "Field Contact.phone (varchar) is gone",
      "options": [
        "move:PhoneNumber.number",
        "drop"
      ],
      "labels": {
        "move:PhoneNumber.number": "Moved to PhoneNumber.number (copies the existing values)",
        "drop": "Dropped (deletes its data)"
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
  "to": "sha256:3f295f8f4faf91b15959a60cf5d586e96c3e70a8fc59aa218765aed35fb8b80f",
  "questions": [
    {
      "id": "field:Contact.phone",
      "kind": "removedField",
      "subject": "Field Contact.phone (varchar) is gone",
      "options": [
        "move:PhoneNumber.number",
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
