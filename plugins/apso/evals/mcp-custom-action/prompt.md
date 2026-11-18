NestJS (TypeScript) Apso project on the newest `@apso/cli`. Our customers want their own AI agents to work with invoices: an agent should be able to look invoices up, and approve one with a short note through a new `POST /invoices/:id/approve` action. Agents must not create, edit or delete invoices. Write the files into the project (the controller, the service and any `.apsorc` change), then print the final controller file and explain what you did and how an agent's calls are kept to its own user's organization.

Current schema:

```json
{
  "version": 2,
  "rootFolder": "src",
  "apiType": "Rest",
  "auth": {
    "provider": "auth0",
    "jwt": {
      "issuer": "https://acme.us.auth0.com/",
      "audience": "https://api.acme.example"
    },
    "claims": {
      "workspaceId": "org_id",
      "roles": "https://acme.example/roles"
    }
  },
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
      "name": "Invoice",
      "scopeBy": "organizationId",
      "created_at": true,
      "updated_at": true,
      "fields": [
        {
          "name": "totalCents",
          "type": "integer"
        },
        {
          "name": "status",
          "type": "enum",
          "values": [
            "draft",
            "approved",
            "paid"
          ],
          "default": "draft"
        },
        {
          "name": "approvalNote",
          "type": "text",
          "nullable": true
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
    }
  ],
  "relationships": [
    {
      "from": "Invoice",
      "to": "Organization",
      "type": "ManyToOne",
      "index": true
    },
    {
      "from": "Project",
      "to": "Organization",
      "type": "ManyToOne",
      "index": true
    }
  ]
}
```
