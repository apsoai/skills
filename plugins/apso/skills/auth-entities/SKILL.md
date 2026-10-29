---
name: auth-entities
category: auth
description: Add authentication entities to a schema. Defines users, accounts, sessions, verification tokens, roles, and permissions. Triggers on "add auth entities", "user authentication schema", "roles and permissions", "RBAC schema".
---

# Authentication Entity Patterns

Add authentication and authorization entities to your schema. Covers user management, credential storage, session handling, email verification, and role-based access control.

## Pattern 1: BetterAuth (Recommended)

BetterAuth requires specific entity names. The User entity is PascalCase; `account`, `session`, and `verification` are lowercase.

```json
{
  "auth": {
    "provider": "better-auth"
  },
  "entities": [
    {
      "name": "User",
      "created_at": true,
      "updated_at": true,
      "fields": [
        { "name": "email", "type": "text", "length": 255, "is_email": true },
        { "name": "name", "type": "text", "length": 100, "nullable": true },
        { "name": "avatar_url", "type": "text", "nullable": true },
        { "name": "email_verified", "type": "boolean", "default": "false" }
      ]
    },
    {
      "name": "account",
      "created_at": true,
      "updated_at": true,
      "fields": [
        { "name": "providerId", "type": "text", "length": 50 },
        { "name": "accountId", "type": "text", "length": 255 },
        { "name": "password", "type": "text", "nullable": true }
      ]
    },
    {
      "name": "session",
      "created_at": true,
      "updated_at": true,
      "fields": [
        { "name": "token", "type": "text", "length": 255, "unique": true },
        { "name": "expiresAt", "type": "timestamptz" },
        { "name": "ipAddress", "type": "text", "length": 45, "nullable": true },
        { "name": "userAgent", "type": "text", "nullable": true }
      ]
    },
    {
      "name": "verification",
      "created_at": true,
      "updated_at": true,
      "fields": [
        { "name": "identifier", "type": "text", "length": 255 },
        { "name": "value", "type": "text", "length": 255 },
        { "name": "expiresAt", "type": "timestamptz" }
      ]
    }
  ],
  "relationships": [
    {"from": "account", "to": "User", "type": "ManyToOne", "index": true},
    {"from": "session", "to": "User", "type": "ManyToOne", "index": true}
  ]
}
```

**Key detail:** Passwords are stored in the `account` table, not the `User` table. BetterAuth looks up `account` records where `providerId = "credential"` and compares the bcrypt hash in `account.password`.

### Naming Conflicts

BetterAuth reserves the names `account`, `session`, and `verification`. If your business domain uses these words:

| Conflict | Rename to |
|----------|-----------|
| Account (business entity) | `Organization` or `Company` |
| Session (user sessions, coaching sessions) | `DiscoverySession`, `CoachingSession` |
| Verification (business verification) | `Approval`, `Confirmation` |

## Pattern 2: User-Organization Link

Connect users to organizations with a junction table for role assignment.

```json
{
  "entities": [
    {
      "name": "OrganizationMember",
      "created_at": true,
      "fields": [
        { "name": "role", "type": "enum", "values": ["owner", "admin", "member", "viewer"], "default": "member" },
        { "name": "status", "type": "enum", "values": ["active", "invited", "suspended"], "default": "active" }
      ]
    }
  ],
  "relationships": [
    {"from": "OrganizationMember", "to": "Organization", "type": "ManyToOne", "index": true},
    {"from": "OrganizationMember", "to": "User", "type": "ManyToOne", "index": true}
  ]
}
```

## Pattern 3: RBAC (Role-Based Access Control)

For apps with granular permissions beyond simple role enums.

```json
{
  "entities": [
    {
      "name": "Role",
      "created_at": true,
      "updated_at": true,
      "scopeBy": "organizationId",
      "fields": [
        { "name": "name", "type": "text", "length": 50 },
        { "name": "description", "type": "text", "nullable": true },
        { "name": "isDefault", "type": "boolean", "default": "false" }
      ],
      "indexes": [
        { "fields": ["organizationId", "name"], "unique": true }
      ]
    },
    {
      "name": "Permission",
      "fields": [
        { "name": "resource", "type": "text", "length": 50 },
        { "name": "action", "type": "enum", "values": ["create", "read", "update", "delete", "manage"] }
      ],
      "indexes": [
        { "fields": ["resource", "action"], "unique": true }
      ]
    }
  ],
  "relationships": [
    { "from": "Role", "to": "Permission", "type": "ManyToMany", "bi_directional": true },
    { "from": "User", "to": "Role", "type": "ManyToMany", "bi_directional": true },
    {"from": "Role", "to": "Organization", "type": "ManyToOne", "index": true}
  ]
}
```

**When to use:** Apps where different organizations define custom roles with different permission sets. If you only need owner/admin/member/viewer, use a simple enum field on the membership table instead.

## Pattern 4: API Key Authentication

For service-to-service or developer API access.

```json
{
  "auth": {
    "provider": "api-key",
    "apiKeyHeader": "x-api-key",
    "apiKeyEntity": "ApiKey"
  },
  "entities": [
    {
      "name": "ApiKey",
      "created_at": true,
      "updated_at": true,
      "scopeBy": "organizationId",
      "fields": [
        { "name": "name", "type": "text", "length": 100 },
        { "name": "keyHash", "type": "text", "length": 255 },
        { "name": "prefix", "type": "text", "length": 10 },
        { "name": "scopes", "type": "json-plain", "nullable": true },
        { "name": "expiresAt", "type": "timestamptz", "nullable": true },
        { "name": "lastUsedAt", "type": "timestamptz", "nullable": true },
        { "name": "status", "type": "enum", "values": ["active", "revoked"], "default": "active" }
      ]
    }
  ],
  "relationships": [
    {"from": "ApiKey", "to": "Organization", "type": "ManyToOne", "index": true},
    {"from": "ApiKey", "to": "User", "type": "ManyToOne", "to_name": "createdBy", "index": true}
  ]
}
```

## Pattern 5: JWT Providers (Auth0, Clerk, Cognito, any JWKS issuer)

When using an external identity provider, you don't store credentials locally. Configure JWT validation instead.

```json
{
  "auth": {
    "provider": "auth0",
    "jwt": {
      "issuer": "https://your-tenant.auth0.com/",
      "audience": "https://api.yourapp.com"
    },
    "claims": {
      "workspaceId": "org_id",
      "roles": "https://yourapp.com/roles"
    }
  }
}
```

The service verifies each token's signature against the issuer's JWKS (`issuer` + `/.well-known/jwks.json` unless `jwt.jwksUri` is set), plus issuer, expiry, and `audience` when set. Needs `@apso/cli` 0.45.0 or later; older versions generated no check for these providers. Works in TypeScript, Go, and Python.

- `clerk`: no `audience` (Clerk tokens have no `aud`); defaults map `o.id` to `workspaceId` and `o.rol` to roles. Set `jwt.authorizedParties` to the frontend origins.
- `cognito`: set `audience` to the app client ID (checked against `client_id` on access tokens); groups map to roles.
- `jwt`: any other issuer with a JWKS (Supabase Auth, Firebase, Better Auth's JWT plugin with `"algorithms": ["EdDSA"]`, Okta, WorkOS). Set `jwksUri` from the provider's `/.well-known/openid-configuration`.
- Claim names match an exact key first (`https://yourapp.com/roles`), then a dotted path (`o.id`, `app_metadata.org_id`).
- `workspaceId` is the tenant that `scopeBy` filters on. `scopeBy` is enforced in TypeScript only.

The User entity still exists in your schema, but it syncs from the provider rather than storing credentials.
