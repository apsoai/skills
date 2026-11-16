# MCP tools and role permissions

Read this before you set `mcp` or `permissions` in an `.apsorc`, add `@McpTool` to a route, or answer a question about API keys.

**Version gate.** `mcp` and `permissions` need `@apso/cli` 0.49.0 or later, and work in TypeScript, Python and Go services. Run `apso --version` first. 0.48.0 and earlier accept both keys in `apso schema validate` and then ignore them in `apso generate`, so the roles are not enforced and no tools are served. On an old CLI, tell the user to upgrade; do not write the keys and call the work done. `@McpTool` on a hand-written route is TypeScript only. The internal address `/mcp/internal` needs a CLI release that includes apsoai/cli#235; on 0.49 and 0.50 a service has one address, `/mcp`, and `mcp` needs an `auth` block.

## Role permissions on an entity

`permissions` says which roles may call each operation of an entity's generated routes.

```json
{
  "name": "Invoice",
  "scopeBy": "organizationId",
  "permissions": { "read": ["owner", "billing"], "delete": ["owner"] },
  "fields": [{ "name": "total", "type": "integer" }]
}
```

- The operations are `read`, `create`, `update` and `delete`. `read` covers the list route and get by id. Any other key fails generation.
- Each value is a list of role names. An operation that is not listed stays open to every signed-in caller. An empty list (`"create": []`) lets no role in by default.
- `permissions` needs an `auth` block. Without one, generate fails with `permissions in .apsorc need an auth block`.
- Roles come from the signed-in caller's token: the `claims.roles` claim (Clerk and Cognito have defaults; set `claims.roles` for Auth0 and `jwt`). Sign-in is JWT only, and `better-auth` is a JWT preset that needs `auth.url`. Use the role names the provider sends.
- Each guarded operation has a permission name, the entity name with a lower-case first letter, a colon and the operation: `invoice:delete`, `lineItem:read`.
- Loading a relation into an entity the caller cannot read is refused, so `GET /organizations?select=*,invoices(*)` does not leak invoices.
- A refused call gets 403 `Missing permission invoice:read`.

`permissions` decides which roles may call an operation. `scopeBy` decides which tenant's rows a caller sees. Most tenant-owned entities need both. The generated `PermissionGuard` runs after `AuthGuard` and before `ScopeGuard`, in the API. The database does not enforce any of this, so do not describe it as row-level security.

### How a caller gets a permission

A caller may perform a guarded operation when any one of these holds:

1. One of its roles is in the list in `.apsorc`.
2. Its token carries the permission name in a `permissions` claim. This is read by default for `auth0` and `jwt`; set `claims.permissions` to use another claim.
3. A row in the grants entity gives the permission to one of its roles.

Tokens and grants only add access. Nothing takes away a default from `.apsorc`. To remove a role's access, change the list and regenerate.

### Runtime grants

Add a grants entity when the customer's admins must change who can do what without a redeploy. It is an ordinary entity named `RolePermission` (or the name in `auth.permissionEntity`) with `role` and `permission` text fields:

```json
{
  "name": "RolePermission",
  "created_at": true,
  "updated_at": true,
  "scopeBy": "organizationId",
  "permissions": { "create": ["owner"], "update": ["owner"], "delete": ["owner"] },
  "fields": [
    { "name": "role", "type": "text", "length": 50 },
    { "name": "permission", "type": "text", "length": 100 }
  ]
}
```

with `{ "from": "RolePermission", "to": "Organization", "type": "ManyToOne", "index": true }`.

An owner then grants a permission with the generated route: `POST /RolePermissions` with `{ "role": "member", "permission": "invoice:read" }`. The row is stored under the owner's tenant and applies only there. Deleting the row revokes it.

The CLI refuses a grants entity that would let a user escalate:

- `permissions` on the grants entity must list roles for `create`, `update` and `delete`. Otherwise: `RolePermission.permissions must list roles for create, update and delete; otherwise any signed-in user can grant themselves any permission`.
- If any other entity has `scopeBy`, the grants entity needs its own direct `scopeBy` field (no dotted path). Otherwise: `RolePermission needs a direct scopeBy field: this schema is tenant-scoped, and an unscoped grant would apply in every tenant`.
- It needs both the `role` and the `permission` field.

Leave the grants entity out when the role lists in `.apsorc` are enough.

`RolePermission` is not where users get their roles. Memberships and custom role tables are still schema design (see the `auth-entities` skill).

## MCP tools

An Apso API can serve its routes as MCP tools. A tool is a route: each tool call goes through the API's HTTP pipeline, so the same key check, `AuthGuard`, `PermissionGuard` and `ScopeGuard` apply to an agent exactly as they do to a REST caller. There is no second set of rules to write for agents.

A service has two MCP addresses, one per audience. `B` is the service's base URL.

| | External, `B/mcp` | Internal, `B/mcp/internal` |
| --- | --- | --- |
| For | The app's end users and their agents | The owner's team, agents and scripts |
| Credential | `Authorization: Bearer <token>` from a sign-in provider in the `auth` block | The service's API key in `x-api-key`. On a service hosted by Apso, a team member can also sign in with their Apso account |
| Caller | The signed-in user, under scope and permission rules | A service caller: every tool, no tenant scope, no role check |
| Exists when | `.apsorc` has an `auth` block and an entity has `mcp` | An entity has `mcp`. No `auth` block needed |

An API key is never accepted on `/mcp`, and a user token is never read on `/mcp/internal`. Pick the address by who is calling: give end users `/mcp`, and keep `/mcp/internal` for the team.

### Opt an entity in

MCP is off by default. Opt in one entity at a time:

```json
{ "name": "Invoice", "mcp": true }
{ "name": "Project", "mcp": ["read"] }
```

- `true` exposes read, create, update and delete. A list exposes only those operations. Anything else fails with `Invoice.mcp must be true or a list of read, create, update, delete`.
- Tool names are `list_invoices`, `get_invoice`, `create_invoice`, `update_invoice` and `delete_invoice`. `read` gives the first two.
- `mcp` does not need an `auth` block. Without one the service serves the internal address only, and `/mcp` does not exist. Add `auth` when end users need tools.
- `apso generate` adds `@apso/mcp` to `package.json` and the `mountMcp(app, document)` call to `src/config/nest-app.config.ts`. Run `npm install` afterwards. If the bootstrap file was rewritten by hand, generate stops and prints the two lines to add.

When to opt in: the user asks for agent access, and the entity is one their end users already work with through the API. Start with `["read"]`, and add writes the user asks for. Do not opt in auth tables (`User`, `session`, `account`), the grants entity, or secrets. On `/mcp` an agent can do whatever its signed-in user can do, so set `permissions` on an entity before you expose its writes. On `/mcp/internal` the caller holds the API key and can call every tool.

### Hand-written routes

Custom actions go in `src/extensions/` like any other custom endpoint (see the `custom-endpoints` skill). Mark the ones agents should call with `@McpTool`:

```typescript
// src/extensions/Invoice/Invoice.controller.ts
import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';
import { McpTool } from '@apso/mcp';

export class ApproveInvoiceDto {
  @ApiProperty({ description: 'Why the invoice was approved' })
  @IsString()
  @MaxLength(500)
  note: string;
}

@ApiTags('invoices')
@Controller('invoices')
export class InvoiceExtensionController {
  constructor(private readonly invoices: InvoiceExtensionService) {}

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve an invoice' })
  @McpTool({
    name: 'approve_invoice',
    description: 'Approve one invoice by id and record a note. Fails if the invoice is already approved.',
  })
  approve(@Param('id') id: string, @Body() dto: ApproveInvoiceDto, @Req() req) {
    return this.invoices.approve(id, dto.note, req.organizationId);
  }
}
```

- **Name and description.** `name` is snake_case, a verb and a noun, unique across the app. The description is what the agent reads to choose the tool: say what the call does, what it needs, and when it fails. `name` defaults to the route's OpenAPI `operationId` and `description` to the `@ApiOperation` summary; write both yourself.
- **Typed body.** The body must be a DTO class whose fields carry `@ApiProperty`. The tool's input schema is built from the route's OpenAPI operation: path and query parameters become top-level arguments, and the JSON body becomes the `body` argument. The app fails at start-up when a marked route has an untyped body (`@Body() body: any`, or an inline type such as `{ note: string }`) or when two tools share a name.
- **Guards.** `AuthGuard` checks the caller. `PermissionGuard` picks the rule from the first path segment and the HTTP method, so `POST /invoices/:id/approve` needs `invoice:create`. Keep the action under the entity's path so a rule applies to it. When an action needs its own rule, name it with `@Permission('invoice:approve', 'admin')` from the generated `guards` folder: the route then needs that permission, and the listed roles have it by default.
- **Tenant.** Extension code does its own queries, so put `req.organizationId` in every where clause, as for any custom endpoint.
- `DELETE` routes are marked destructive and `GET` routes read-only. Set `destructive: true` on a `POST` that cannot be undone.
- A hand-written tool needs no `mcp` key of its own, but the project must be wired: `apso generate` adds `@apso/mcp` and the `mountMcp` call only when at least one entity sets `mcp`. If none does, add `@apso/mcp` to `package.json` and call `mountMcp(app, document)` after `SwaggerModule.createDocument` yourself. Nothing is served until then.

### How an end user connects

The end user's MCP client calls `B/mcp`. A request without a valid token gets a 401 that points the client at the sign-in provider in the `auth` block, and the user signs in with the service's existing login. Set `MCP_RESOURCE_URL` to the public URL of `/mcp`, such as `https://api.example.com/mcp`, when the service runs behind a proxy. Whether a given provider completes that flow with a given MCP client has not been tested per provider, so do not promise it.

Scopes are not checked: a signed-in user's agent can do everything that user can.

### How the team connects

The team's client calls `B/mcp/internal` with the API key:

```bash
claude mcp add --transport http my-api http://localhost:3000/mcp/internal --header "x-api-key: $APSO_API_KEY"
```

On a service hosted by Apso the client can instead be added with the address alone. It opens the Apso sign-in page, and a member with write access to the service approves it. Either way the caller is a service caller, so treat the address like the key: never hand it to an end user.

## API keys

- The `auth` block is for user sign-in only. Do not write `"provider": "api-key"` and do not suggest it. The provider was removed in 0.49.0, and an `.apsorc` that names it fails at generate.
- Every generated service has a built-in key check. Set `APSO_API_KEY` in the service's environment and send the key in the `x-api-key` header. A service hosted by Apso gets its keys from the platform's API Keys page.
- There is one kind of API key: a secret held by a server. A caller with a valid key is a service caller. It may call any route, is not tenant-scoped and skips role checks.
- So a key never goes in browser or mobile code, a `NEXT_PUBLIC_*` variable, or a repository. A browser calls the API with the signed-in user's token or session. If a frontend needs a key-only call, route it through the frontend's own server.
- The default is no access: a service with no key and no `auth` block answers 401 on every route.
- Use the key for server-to-server calls and the team's own agents. Set up user sign-in for everything an end user or their agent calls.

## Check before you finish

- `apso --version` is 0.49.0 or later.
- If the `.apsorc` sets `permissions`, or end users need MCP tools, it has an `auth` block, and no provider is `api-key`.
- End users were given `/mcp`, never `/mcp/internal` or the API key.
- Every role named in `permissions` is a role the auth provider sends.
- A grants entity has role lists for `create`, `update` and `delete`, and a direct `scopeBy` when the schema is tenant-scoped.
- Every `@McpTool` route has a name, a description, and a DTO class body.
- Nothing you wrote calls tenant scoping row-level security.
