# Tenant scoping rules

Read this before you write or change `scopeBy` in an `.apsorc`. Apso enforces tenant isolation in the generated API, so the schema is the only place it is declared. A tenant-owned entity without a correct `scopeBy` is readable by every tenant.

## Rules

1. **Scope every entity that holds tenant data.** That includes child entities: a `Comment` on a `Task`, a `LineItem` on an `Order`, an `Attachment` on a `Document`. If a row belongs to one customer, its entity gets `scopeBy`.
2. **Scope by a column on the entity itself.** Give each tenant-owned entity its own tenant column, such as `organizationId`, and set `"scopeBy": "organizationId"`. Copying the tenant column onto child entities is intentional. It is what the generated API filters on.
3. **Never write a nested path** such as `"scopeBy": "task.organizationId"`. Python and Go services don't enforce nested paths at all. TypeScript services through `@apso/cli` 0.46.0 enforce them only on requests for one row, so a list request returns every tenant's rows. Use rule 2 instead.
4. **Use the same tenant column name across the schema.** If projects use `organizationId`, tasks and comments do too. The column holds the caller's tenant from the auth context (`workspaceId` claim, session organization, or API key tenant).
5. **Add the tenant column one of two ways:**
   - A many-to-one relationship to the tenant entity, when the tenant is in the schema: `{"from": "Comment", "to": "Organization", "type": "ManyToOne", "index": true}` creates `organizationId`.
   - A plain field, when the tenant lives in the auth provider (Clerk or Auth0 organization IDs): `{"name": "organizationId", "type": "text", "length": 64}`.
6. **Index it.** Use `"index": true` on the relationship, or a composite index that starts with the tenant column, such as `["organizationId", "status"]`.
7. **Scope private data by owner too.** For tenant rows only their creator can see, such as drafts, use `"scopeBy": ["organizationId", "userId"]`. Data that belongs to a user across tenants, such as notification preferences, uses `"scopeBy": "userId"`.
8. **Don't scope these:**
   - the tenant entity itself (`Organization`, `Workspace`, `Tenant`)
   - global lookup tables (`Country`, `Currency`, `Plan`)
   - auth entities (`User`, `Session`, `Account`, `Verification`)
9. **Don't rely on `bypassRoles` or `enforceOn` for cross-tenant access.** In a TypeScript service with auth, the generated controller filters direct scope fields for every caller, whatever these options say. Build support or admin views as a separate endpoint or service, and tell the user.

## Example

A project tracker where comments belong to tasks:

```json
{
  "entities": [
    { "name": "Organization", "fields": [{ "name": "name", "type": "text" }] },
    { "name": "Project", "scopeBy": "organizationId", "fields": [{ "name": "name", "type": "text" }] },
    { "name": "Task", "scopeBy": "organizationId", "fields": [{ "name": "title", "type": "text" }] },
    { "name": "Comment", "scopeBy": "organizationId", "fields": [{ "name": "body", "type": "text" }] }
  ],
  "relationships": [
    { "from": "Project", "to": "Organization", "type": "ManyToOne", "index": true },
    { "from": "Task", "to": "Organization", "type": "ManyToOne", "index": true },
    { "from": "Comment", "to": "Organization", "type": "ManyToOne", "index": true },
    { "from": "Project", "to": "Task", "type": "OneToMany" },
    { "from": "Task", "to": "Comment", "type": "OneToMany" }
  ]
}
```

`Comment` has its own `organizationId` even though it could reach the organization through `task`. That direct column is what keeps one tenant's comments out of another tenant's list.

## Check before you finish

For each entity in the `.apsorc`:

- If it holds tenant data, it has `scopeBy`, and every value in it is a plain field name with no dot.
- The `scopeBy` column exists on the entity, as a field or through a many-to-one relationship to the tenant.
- If it is the tenant entity, a lookup table, or an auth entity, it has no `scopeBy`.
