# Relational Patterns for Apso

How to model common relational patterns in Postgres, and how to encode each one in `.apsorc`. Design first: pick the Postgres shape a good engineer would choose, then encode it. When `.apsorc` cannot express part of the design, encode the closest form and tell the user which guarantee is missing and where to enforce it (a custom endpoint, a hand-written migration, or a scheduled job).

Each entry gives: **Use when**, **Postgres**, **.apsorc**, and **Missing** (the guarantee Apso cannot emit). "Missing: none" means `.apsorc` expresses the full design.

## What `.apsorc` can and cannot express

Can: `primaryKeyType` `uuid` or `serial`; field types `text`, `varchar`, `integer`, `float`, `decimal`/`numeric`, `boolean`, `date`, `timestamptz`, `timestamp`, `uuid`, `enum`, `json` (stored as `jsonb`), `array`; `nullable`, `unique`, `index`, `default`; multi-column `indexes` (optionally `unique: true`) and `uniques`; relationships with `to_name`, `nullable`, `index`, `cascadeDelete`; `created_at` / `updated_at`; `scopeBy`; `emitEvents`.

Cannot: `CHECK` constraints, partial or expression indexes (`WHERE deleted_at IS NULL`, `lower(email)`), exclusion constraints, range types, `ON DELETE SET NULL`, composite primary or foreign keys, payload columns on an implicit `ManyToMany` join table, a version column, views, triggers.

Foreign key columns are named `<to_name or entity>Id` (for example `projectId`, `parentId`). Use those names in `indexes` and `uniques`. Without `cascadeDelete`, deleting a parent that still has children fails (`NO ACTION`).

## Relationship rules

- Declare each relationship once, as a `ManyToOne` from the child. Apso generates the inverse collection. Never add the matching `OneToMany` as well; it duplicates the foreign key.
- A self-reference is one `ManyToOne` with a `to_name` and `nullable: true`. No `children` OneToMany.
- Two relationships to the same entity need distinct `to_name` values (`author`, `assignee`).
- Set `"index": true` on every `ManyToOne`. Apso does not index foreign keys on its own.

## 1. Keys

**Surrogate key.** Use when: always. Postgres: `id uuid` primary key. .apsorc: `"primaryKeyType": "uuid"` on the entity; never declare an `id` field. Missing: none.

**Natural key as an alternate key.** Use when: a business value must be unique (email, slug, SKU). Postgres: surrogate PK plus `UNIQUE`. .apsorc: `"unique": true` on the field, or `"uniques": [{ "fields": ["organizationId", "slug"] }]` when it is unique per tenant. Missing: case-insensitive uniqueness (`lower(email)`); lowercase the value before saving.

## 2. Relationships

**One-to-many.** Use when: a child belongs to one parent. Postgres: `parent_id` FK plus an index. .apsorc: `{ "from": "Task", "to": "Project", "type": "ManyToOne", "index": true }`. Missing: `ON DELETE SET NULL`; clear the reference in a custom endpoint if needed.

**Owned children (dependent mapping).** Use when: children make no sense without the parent (order lines, comments on a post). Postgres: FK with `ON DELETE CASCADE`. .apsorc: add `"cascadeDelete": true` to the child's `ManyToOne`. Missing: none.

**Many-to-many without data.** Use when: the link carries nothing but the pair (tags on a post). Postgres: junction table with a composite PK. .apsorc: `{ "from": "Post", "to": "Tag", "type": "ManyToMany", "bi_directional": true }`. Missing: none.

**Associative entity (junction with data).** Use when: the link has its own data (role, joined date, quantity). Postgres: junction table with extra columns and `UNIQUE (a_id, b_id)`. .apsorc: an explicit entity with two `ManyToOne` relationships and `"uniques": [{ "fields": ["userId", "projectId"] }]`. Missing: none.

**One-to-one extension table.** Use when: optional or rarely read columns that belong to one row of another table (a user's billing profile). Postgres: `child.parent_id` as PK and FK. .apsorc: `{ "from": "BillingProfile", "to": "User", "type": "OneToOne" }`. Missing: the child gets its own id and a unique FK, not PK = FK.

**Several possible parents (exclusive arc).** Use when: one table (attachments, comments) hangs off a few entity types. Postgres: one nullable FK per parent type plus `CHECK (num_nonnulls(project_id, task_id) = 1)`. .apsorc: one nullable `ManyToOne` per parent type, each with `index: true`. Missing: the "exactly one" CHECK; validate it in the create and update handlers. Do not use `entityType` + `entityId` text columns instead; Postgres cannot put a foreign key on them.

## 3. Hierarchies

**Adjacency list (default tree).** Use when: categories, folders, org charts, threaded replies. Postgres: `parent_id` self-FK, recursive CTE for subtrees. .apsorc: `{ "from": "Folder", "to": "Folder", "type": "ManyToOne", "to_name": "parent", "nullable": true, "index": true }`. Missing: a `CHECK (parent_id <> id)` against self-parenting, and cycle prevention; check both in the update handler. Whole-subtree reads need a custom endpoint.

**Materialized path.** Use when: deep, read-heavy trees where you query whole subtrees. Postgres: `path ltree` with a GiST index. .apsorc: a `text` `path` field (`/root/child/`) with `index: true`, alongside the adjacency `parent`. Missing: ltree operators; subtree queries use a prefix match in a custom endpoint, and moves rewrite every descendant's path.

**Closure table.** Use when: frequent ancestor and descendant queries on a tree that changes. Postgres: `(ancestor_id, descendant_id, depth)`. .apsorc: an entity with two `ManyToOne` to the node (`to_name: "ancestor"` and `"descendant"`), an `integer` `depth`, and `uniques` on the pair. Missing: rows are maintained by app code on every insert and move.

## 4. Inheritance (subtypes)

**Single table.** Use when: subtypes share most columns and you list them together (payment methods: card, bank). Postgres: one table, a `kind` column, nullable subtype columns, and a CHECK per kind. .apsorc: an `enum` `kind` plus `nullable` subtype fields. Missing: per-kind required fields; validate them in the create handler.

**Supertype plus subtype tables (class table).** Use when: subtypes have many distinct columns but share identity and relationships (a Party that is a Person or an Organization). Postgres: subtype PK = FK to the supertype. .apsorc: a supertype entity holding shared fields and a `kind` enum, and each subtype entity with `{ "type": "OneToOne", "to": "<Supertype>" }`. Missing: PK = FK, and the rule that a supertype row has exactly one subtype row.

**Separate tables (concrete table).** Use when: subtypes are never queried together. Postgres and .apsorc: unrelated entities. Missing: none.

## 5. Time and history

**Moments in time.** Use when: anything that happened or will happen at an instant. Postgres: `timestamptz`. .apsorc: `"type": "timestamptz"`, named `*At` (`paidAt`, `expiresAt`). Use `date` only for calendar days (`birthDate`, `dueDate`). Missing: none.

**Audit columns.** Use when: every entity. .apsorc: `"created_at": true, "updated_at": true`, plus a `ManyToOne` to `User` with `to_name: "createdBy"` when the actor matters. Missing: none.

**Effective dating.** Use when: a value is valid for a period (a price, a tax rate, a plan's terms, an assignment). Postgres: `valid_during tstzrange` with `WITHOUT OVERLAPS` or an exclusion constraint. .apsorc: `validFrom` `timestamptz` and `validTo` `timestamptz` with `nullable: true` (open-ended), plus `indexes` on `["<parent>Id", "validFrom"]`. Missing: overlap prevention; check for overlapping periods in the create and update handlers.

**Versioned rows.** Use when: you must keep every past version of a document, contract or config and point at the one in force. Postgres: an identity table plus `entity_version(entity_id, version, ...)`, unique on the pair, and a partial unique index for "one current version". .apsorc: `Contract` plus `ContractVersion` with `{ "from": "ContractVersion", "to": "Contract", "type": "ManyToOne", "cascadeDelete": true }`, an `integer` `version`, and `"uniques": [{ "fields": ["contractId", "version"] }]`. Point at the current version with a nullable `ManyToOne` from `Contract` to `ContractVersion` with `to_name: "currentVersion"`. Missing: the partial unique index; set the current pointer in one handler.

**Status history.** Use when: you need to know when a record entered each state. .apsorc: an `enum` status on the record, plus a history entity with `fromStatus`, `toStatus`, `changedAt` `timestamptz` and a `ManyToOne` to the record with `cascadeDelete`. Missing: none. See the workflow-state skill.

**Audit log.** Use when: a generic append-only record of changes across many entities. .apsorc: an entity with `entityType`, `entityId`, `action`, `before` and `after` `json`. This is the one place a type-plus-id reference is correct, because log rows must outlive the records they describe. See the audit-trail skill.

## 6. Constraints and fixed values

**Enum for fixed sets.** Use when: the values are part of the code (order status, priority). .apsorc: `"type": "enum", "values": [...]`, with a real `default`, never `null`. Missing: none.

**Lookup entity for editable sets.** Use when: users or admins add values (pipeline stages, ticket categories, expense types). .apsorc: a lookup entity (`name`, `slug`, `sortOrder`, `isActive`) and a `ManyToOne` to it. Missing: none. Using an enum here means a migration every time someone adds a value.

**Unique among live rows.** Use when: soft-deleted rows must not block reuse of a value, or "only one primary address per user". Postgres: `UNIQUE ... WHERE deleted_at IS NULL`. .apsorc: cannot express it. Missing: the whole constraint; check it in the create and update handlers, and tell the user. Do not add a plain `unique`; it will block reuse.

**Value rules.** Use when: `quantity > 0`, `endsAt > startsAt`, percentages between 0 and 100. Postgres: `CHECK`. .apsorc: cannot express it. Missing: validate in the handlers or DTOs.

## 7. Multi-tenancy

**Shared schema with a tenant column.** Use when: SaaS with many small tenants (the default). Postgres: `tenant_id` on every tenant-owned table, indexes that start with it, and composite FKs so a child cannot point at another tenant's parent. .apsorc: a `ManyToOne` to the tenant entity, `"scopeBy": "organizationId"`, and `indexes` that start with `organizationId`. Missing: composite FKs; `scopeBy` enforces isolation in the API, not in the database. See the multi-tenancy skill.

## 8. Money and quantities

**Money.** Use when: any amount. Postgres: `numeric(19,4)` or integer minor units, plus a `currency` code. .apsorc: `"type": "decimal", "precision": 19, "scale": 4` (or `integer` cents named `*Cents`), and `currency` as `varchar` with `length: 3` when amounts can differ in currency. Never `float`. Missing: a CHECK on the currency code.

**Price snapshot on lines.** Use when: orders, invoices, quotes. Copy the unit price, tax rate and product name onto the line when it is created; never join back to the live product for historical totals. .apsorc: those fields on the line entity. Missing: none.

## 9. Flexible attributes

**JSON column.** Use when: loose, rarely filtered attributes (provider payloads, display settings, file metadata). .apsorc: `"type": "json"` (stored as `jsonb`). Missing: GIN indexes, so do not filter or join on keys inside it at scale; promote those to real columns.

**Custom fields.** Use when: tenants define their own fields on a record. Postgres: a field definition table plus values in `jsonb`, validated against the definitions. .apsorc: a `CustomFieldDefinition` entity (`key`, `label`, `fieldType` enum, `entityType` enum, `required`) scoped to the tenant, and a `customFields` `json` field on each target entity. Missing: validation of values against definitions; do it in the handlers. Avoid a row-per-value table (EAV).

**Settings.** Use when: per-user or per-tenant preferences. .apsorc: a settings entity with typed columns and a `OneToOne` to the owner, or a key-value entity with `uniques` on `["userId", "key"]` when the keys are open-ended. Missing: none.

## 10. Ordering and numbering

**Position column.** Use when: users drag to reorder (tasks in a column, steps in a template). .apsorc: an `integer` `position` and `indexes` on `["<parent>Id", "position"]`. Missing: a deferrable unique constraint; do not add `uniques` on the pair, because reordering swaps would violate it mid-update.

**Per-tenant sequence number.** Use when: human-facing numbers like `INV-1042` that restart per tenant. Postgres: `UNIQUE (tenant_id, number)` plus a counter row locked on increment. .apsorc: an `integer` `number` with `"uniques": [{ "fields": ["organizationId", "number"] }]`, plus a counter entity (`organizationId`, `kind`, `nextValue`). Missing: the atomic increment; do it in a custom endpoint inside a transaction.

## 11. Reliability

**Idempotency keys.** Use when: clients retry payments, webhooks or order submissions. .apsorc: an entity with `key`, `requestHash`, `responseBody` `json` and `"uniques": [{ "fields": ["userId", "key"] }]`. Missing: the check-and-store logic; it lives in a custom endpoint.

**Transactional outbox.** Use when: a write must reliably trigger an event (email, webhook, sync). .apsorc: `"emitEvents": true` on the entity. Missing: none. See the domain-events skill.

**Optimistic locking.** Use when: two users edit the same record and lost updates matter. Postgres: a `version` column checked on update. .apsorc: cannot express it. Missing: compare `updated_at` in the update handler and reject stale writes.

## 12. Common app shapes

**Order and lines.** `Order` (status enum, `placedAt` timestamptz, totals as `decimal`, per-tenant `number`), `OrderLine` (`quantity` integer, `unitPrice` decimal, `productName` snapshot) with `{ "from": "OrderLine", "to": "Order", "type": "ManyToOne", "cascadeDelete": true, "index": true }` and a non-cascading `ManyToOne` to `Product`. Invoices and quotes follow the same shape.

**Comments and reactions.** `Comment` with a `ManyToOne` to its parent record (`cascadeDelete`), an `author` `ManyToOne` to `User`, and an optional self `parent` for threads. `Reaction` with `ManyToOne` to `Comment` and to `User`, a `kind` enum, and `uniques` on `["commentId", "userId", "kind"]`. Store likes as rows, never as a counter field you increment.

**Membership and roles.** A membership entity between `User` and `Organization` with a `role` enum and `uniques` on the pair. See the auth-entities skill.

**Soft delete.** A nullable `deletedAt` `timestamptz`. Unique business values then need the "unique among live rows" handling above. See the soft-delete skill.

## Anti-patterns to flag

| Anti-pattern | How it shows up in `.apsorc` | Fix |
|---|---|---|
| Hand-written foreign key | A `*Id` or `*_id` field with no relationship | Delete the field, declare a `ManyToOne` |
| Duplicate relationship sides | `A OneToMany B` and `B ManyToOne A` | Keep only the `ManyToOne` |
| Required self-reference | Self `ManyToOne` without `nullable: true`, or a self `OneToMany` | One nullable self `ManyToOne` |
| Type-plus-id reference | `entityType` + `entityId` fields outside an audit log | Exclusive arc or per-type `ManyToMany` |
| Id lists in one column | `array` or text field named `*Ids` | Junction entity or `ManyToMany` |
| Numbered columns | `tag1`, `tag2`, `phone2` | Child entity |
| EAV | Entity shaped like `attribute`, `value` | Real columns, or a `json` field |
| Tables per period | `Orders2024`, `RevenueQ1` | One entity with a date column |
| Float money | `float` on amount, price or total | `decimal` or integer cents |
| Instant stored as a day | `date` on a `*At` field | `timestamptz` |
| Long text truncated | `varchar` on description, notes or body | `text` |
| Enum for editable values | Enum values that users would want to add | Lookup entity |
| Counter instead of rows | `likeCount`, `viewCount` incremented in place | Rows, with the count computed or cached |
| Plain unique on a soft-deleted entity | `unique` plus `deletedAt` | Check among live rows in handlers |
| Unindexed foreign key | `ManyToOne` used in filters without `index: true` | Add `index: true` |
| Password on User | Any `password` field outside BetterAuth's Account | Use the auth entities |
