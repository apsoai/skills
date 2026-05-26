---
name: auth-entities
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
        { "name": "expiresAt", "type": "date" },
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
        { "name": "expiresAt", "type": "date" }
      ]
    }
  ],
  "relationships": [
    { "from": "User", "to": "account", "type": "OneToMany" },
    { "from": "account", "to": "User", "type": "ManyToOne" },
    { "from": "User", "to": "session", "type": "OneToMany" },
    { "from": "session", "to": "User", "type": "ManyToOne" }
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
    { "from": "Organization", "to": "OrganizationMember", "type": "OneToMany" },
    { "from": "OrganizationMember", "to": "Organization", "type": "ManyToOne" },
    { "from": "User", "to": "OrganizationMember", "type": "OneToMany" },
    { "from": "OrganizationMember", "to": "User", "type": "ManyToOne" }
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
    { "from": "Organization", "to": "Role", "type": "OneToMany" },
    { "from": "Role", "to": "Organization", "type": "ManyToOne" }
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
        { "name": "expiresAt", "type": "date", "nullable": true },
        { "name": "lastUsedAt", "type": "date", "nullable": true },
        { "name": "status", "type": "enum", "values": ["active", "revoked"], "default": "active" }
      ]
    }
  ],
  "relationships": [
    { "from": "Organization", "to": "ApiKey", "type": "OneToMany" },
    { "from": "ApiKey", "to": "Organization", "type": "ManyToOne" },
    { "from": "User", "to": "ApiKey", "type": "OneToMany", "to_name": "createdBy" },
    { "from": "ApiKey", "to": "User", "type": "ManyToOne", "to_name": "createdBy" }
  ]
}
```

## Pattern 5: JWT Providers (Auth0, Clerk, Cognito)

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
      "userId": "sub",
      "email": "email",
      "roles": "roles",
      "organizationId": "org_id"
    }
  }
}
```

The User entity still exists in your schema, but it syncs from the provider rather than storing credentials.
