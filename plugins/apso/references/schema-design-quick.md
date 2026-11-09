# Schema Design Quick Reference

Everything needed to write a new `.apsorc` that deploys. The full guides (`apso-schema-guide.md`, `relational-patterns.md`, `postgres-performance.md`, `tenant-scoping.md`, `data-modeling-principles.md`) are for edge cases only: open one when a requirement needs a pattern not covered here (trees with ordering, versioned rows, subtypes, effective dates, custom fields).

## File shape

```json
{
  "version": 2,
  "rootFolder": "src",
  "apiType": "Rest",
  "entities": [ { "name": "Project", "created_at": true, "updated_at": true, "scopeBy": "organizationId", "fields": [], "indexes": [], "uniques": [] } ],
  "relationships": [ { "from": "Project", "to": "Organization", "type": "ManyToOne", "index": true } ]
}
```

`entities` and `relationships` are arrays, never objects keyed by name.

## Names (what Apso generates)

- Entity names are PascalCase with acronyms written as words: `SlaPolicy`, `WorkspaceApiKey`, `CsatRating`. Not `SLAPolicy` or `APIKey`: Apso turns `SLAPolicy` into the table `s_l_a_policy` and the foreign key `slapolicyId`.
- A `ManyToOne` adds the column `<to_name or to, first letter lowercased>Id`: `to: "SlaPolicy"` gives `slaPolicyId`, `to: "User", to_name: "assignee"` gives `assigneeId`. Use these names in `indexes`, `uniques` and `scopeBy`. `to: "ProductVariant"` gives `productVariantId`; to get `variantId`, set `"to_name": "variant"`. Never add the foreign key as a field too.
- `"created_at": true` and `"updated_at": true` add columns named `created_at` and `updated_at`. Index them by those names, not `createdAt`.
- The primary key is `id`. For tables that grow without bound (events, logs, messages, line items) set `"primaryKeyType": "uuid"`. Never add an `id` field.

## Fields

`{ "name": "email", "type": "text", "nullable": true, "unique": true, "default": "x", "values": [...], "precision": 12, "scale": 2 }`

Types: `text`, `varchar`, `integer`, `float`, `decimal`, `numeric`, `boolean`, `date`, `timestamptz`, `timestamp`, `uuid`, `enum`, `json`.

- Lists (tags, scopes, permissions, recipients, feature lists) are `json`. Do not use `array`: `apso migrate` cannot write it yet and the schema will not deploy.
- Moments (`paidAt`, `expiresAt`) are `timestamptz`; `date` is a calendar day only.
- Long text (descriptions, notes, bodies) is `text`; `varchar` truncates at 255.
- Money is `decimal` with `precision` and `scale`.
- Status fields are `enum` with `values` and a `default` from those values.
- Fields are required by default; `"nullable": true` makes one optional. There is no `required` key.

## Relationships

- Declare each link once, as a `ManyToOne` from the child to the parent, with `"index": true`. Apso generates the parent's collection. Do not also declare the `OneToMany`.
- Two links to the same entity need distinct `to_name`s (`owner`, `assignee`).
- A tree is one self `ManyToOne` with `"to_name": "parent", "nullable": true`.
- Many-to-many with no extra columns: one `ManyToMany`. If the link carries data (role, joinedAt, position), make it a junction entity with two `ManyToOne`s and a `uniques` entry on the pair.
- `OneToOne` puts the foreign key on the `from` entity, and Apso makes that column unique, which also indexes it. Use it for one row per parent (settings, a CSAT rating per ticket). Never name a OneToOne's column in `indexes` or `uniques`: it is already unique, and `apso migrate` rejects the entry as "not a field".

## Tenancy

The tenant root (usually `Organization`) is an entity. Every entity holding tenant data, including children (line items, comments, replies, attachments, settings), gets `"scopeBy": "organizationId"` and its own `ManyToOne` to `Organization` (`"index": true`, unless an index or unique below starts with `organizationId`). Never scope through a parent with a dot path. Skip `scopeBy` only on the tenant root, global lookups and auth entities.

## Indexes: each foreign key leads exactly one index

- Index for the lists the screens show: equality columns first, then the sort column. Board of a project's tasks by status and due date: `["projectId", "status", "dueDate"]`. When the list filters by a parent foreign key, that key goes first, not `organizationId`.
- A `ManyToOne` with `"index": true` and an `indexes` or `uniques` entry that also starts with that column is a duplicate. Keep the composite and drop `"index": true`.
- A field with `"unique": true` is already indexed; do not also give it `"index": true` or an `indexes` entry on that column alone.
- Business keys are unique per tenant: `"uniques": [{ "fields": ["organizationId", "slug"] }]`. That unique also serves lookups by `organizationId`, so drop a separate `organizationId` index on that entity.
- No index on a boolean or a few-valued status alone.

## Before writing

Check, entity by entity, then write `.apsorc` once:

1. Every requested entity is present.
2. Every column named in `scopeBy`, `indexes` or `uniques` is a field of this entity or the column of a `ManyToOne` declared `from` this entity, spelled exactly as the Names section builds it (`productVariantId`, not `variantId`, unless `to_name` is `variant`). A relationship declared from the other entity, or a `ManyToMany`, puts no column here; a tenant column needs its own `ManyToOne` to `Organization`. A `OneToOne` column goes in `scopeBy` only, never in `indexes` or `uniques`.
3. For every `ManyToOne`, including the one to `Organization`, exactly one of `"index": true` or an `indexes`/`uniques` entry starts with its column. When a unique such as `["organizationId", "code"]` exists, the `Organization` link has no `"index": true`.
4. No `array` fields and no acronym runs in entity names.
