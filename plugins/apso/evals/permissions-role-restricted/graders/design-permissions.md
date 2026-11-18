---
type: llm
---

Judge the `.apsorc` printed in the response against the rules the Apso CLI enforces at generate, and the explanation:
- Invoice has `permissions` with `read` listing exactly owner and billing, and `delete` listing exactly owner. The only operation keys used anywhere are `read`, `create`, `update` and `delete`, and every value is a list of role names.
- Project has no `permissions`, or none that restricts it.
- There is a `RolePermission` entity with a `role` field and a `permission` field.
- `RolePermission` has its own `permissions` listing roles for all three of `create`, `update` and `delete`, and owner is the role allowed. Missing any of the three fails.
- `RolePermission` has `scopeBy` set to a plain field name with no dot, and that tenant column exists through a field or a many-to-one relationship to Organization.
- The `auth` block is still the Auth0 provider. Existing entities and fields are preserved.
- The explanation refuses the browser API key: it says the `api-key` provider should not be used or is being removed, and that an API key is a server-side secret that must not be in browser code, so the dashboard calls the API with the signed-in user's token.
- The explanation does not call tenant scoping row-level security.
