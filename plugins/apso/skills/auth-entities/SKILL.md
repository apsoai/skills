---
name: auth-entities
category: auth
description: Add authentication entities to a schema. Defines users, accounts, sessions, verification tokens, roles, and permissions. Use for any change to who belongs to what and what they may do: users in several organizations, memberships with a role per organization, custom roles, permissions on resources, which roles may read, create, update or delete an entity (`permissions` in `.apsorc`), runtime permission grants, and API key questions. Triggers on "only admins can delete", "restrict to a role", "role permissions", "grant a permission", "API key", "add auth entities", "user authentication schema", "roles and permissions", "RBAC schema", "users belong to several organizations", "role in each organization", "custom roles", "fine-grained permissions", "membership".
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

## Pattern 4: Restrict operations to roles (enforced by the API)

Patterns 2 and 3 store who has which role. They do not stop anyone calling a route. To have the API refuse a call, set `permissions` on the entity. Use this when the user says which roles may read, create, update or delete something.

```json
{
  "name": "Invoice",
  "scopeBy": "organizationId",
  "permissions": { "read": ["owner", "billing"], "delete": ["owner"] },
  "fields": [{ "name": "total", "type": "integer" }]
}
```

An operation that is not listed stays open to every signed-in caller. When admins must change access at runtime, add the `RolePermission` grants entity with its own `permissions` for `create`, `update` and `delete` and its own `scopeBy`. The CLI refuses a grants entity without them, because any user could then grant themselves access.

Read `${CLAUDE_PLUGIN_ROOT}/references/mcp-and-permissions.md` before you write `permissions`: it has the grants entity, the CLI's checks, where roles come from, and the version this needs (TypeScript, `@apso/cli` later than 0.48.0, an `auth` block).

## API keys

Do not use `"provider": "api-key"` in the `auth` block. It is being removed (apsoai/cli#207); `auth` is for user sign-in only. An API key is a server-side secret: a caller that holds one is not tenant-scoped, so it never goes in browser code. See the API keys section of `${CLAUDE_PLUGIN_ROOT}/references/mcp-and-permissions.md`.

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
- `workspaceId` is the tenant that `scopeBy` filters on. TypeScript, Go and Python (CLI 0.46.0+) enforce `scopeBy` on the entity's own fields. Don't use nested paths such as `task.workspaceId`: Python and Go ignore them, and TypeScript through 0.46.0 doesn't apply them to list requests. Give each tenant-owned entity its own tenant column; see `${CLAUDE_PLUGIN_ROOT}/references/tenant-scoping.md`.

The User entity still exists in your schema, but it syncs from the provider rather than storing credentials.
