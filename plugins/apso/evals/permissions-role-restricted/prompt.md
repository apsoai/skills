NestJS (TypeScript) Apso project on the newest `@apso/cli`. Roles arrive in the Auth0 token as `owner`, `billing` or `member`. I need three things:

1. Only owners and billing may read invoices, and only owners may delete them. Projects stay open to everyone who is signed in.
2. An organization's owners must be able to let another role read invoices later, from our admin screen, without us redeploying.
3. Our React dashboard runs in the browser. I was going to give it an API key for the API by switching the auth provider to `api-key`. Set that up if it is the right call.

Write the updated schema to `.apsorc` in the current directory, then print the final file contents and explain what you did.

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
