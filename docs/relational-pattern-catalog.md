# Relational Pattern Catalog (draft)

Draft for review, 2026-10-21. Scope: relational design patterns for OLTP application schemas on Postgres, and how each one encodes in `.apsorc`. Warehouse modeling (star, snowflake, data vault), NoSQL, event sourcing as a system of record, and sharding are out of scope.

Each pattern has two layers, matching how the skills work:
1. **Design**: the Postgres shape a good engineer would choose.
2. **Encoding**: how to express it in `.apsorc`, and what Apso can't express.

## Sources

| Source | What it contributed | Status |
|---|---|---|
| Bytebase, "Database Design Patterns" | Normalization, EAV, polymorphic, tenancy models, anti-patterns | Read |
| Exasol, "Database Design Principles" | Keys, FKs, constraints, deliberate cascades, workload indexing, OLTP vs analytics split, schema evolution, 8 anti-patterns | Read |
| Stathopoulou and Vassiliadis, "Design Patterns for Relational Databases" (odbms.org PDF) | Pivoting (flat vs attribute-value), materialization (template vs instance), generalization (4 inheritance mappings) | Read |
| Stack Overflow q145689 | Lookup tables, uni-table, mixed-use DB; pointers to Hay, Silverston, Fowler, Coad | Read |
| objects.ws, "Scalable Database Design" | Normalization, indexing, partitioning (thin) | Read |
| Medium, Khrenov, "Database Design Patterns" | Not read. Cloudflare blocks automated fetches; paste the text to include it | Missing |
| Karwin, *SQL Antipatterns* | Antipatterns and fixes | Chapter list verified; fix details from the book, not re-read |
| Fowler, *PoEAA* and temporal patterns | Inheritance mappings, identity, FK and association mapping, effectivity, audit log, optimistic lock | Verified |
| Fowler, *Analysis Patterns* ch. 2 | Party, accountability, knowledge level | Verified |
| Silverston, *Data Model Resource Book*; Hay, *Data Model Patterns* | Party, role, contact mechanism, product, order, agreement | Bibliographic only; model details from the books, not re-read |
| Snodgrass; Postgres 18 docs | Valid-time, system-time, bitemporal, `WITHOUT OVERLAPS`, `uuidv7()` | Verified |
| Postgres wiki "Don't Do This"; Azure and Citus tenancy guides; microservices.io outbox; Brandur on idempotency and soft delete | Postgres defaults, tenancy, outbox, idempotency, soft delete tradeoffs | Verified |

Full research notes with per-pattern citations are in `relational-pattern-research.md` next to this file.

## What `.apsorc` can express

Verified against `@apso/cli` source (`src/lib/types/*.ts`, `utils/field.ts`, `templates/entities/entity.eta`).

| Can express | Can't express |
|---|---|
| `primaryKeyType`: `serial` or `uuid` | Identity columns, composite PKs, natural PKs |
| Field types: text, varchar (+`length`), integer, float, decimal/numeric (+`precision`, `scale`), boolean, date, timestamp, timestamptz, uuid, enum (+`values`), json, json-plain, array (+`elementType`) | `CHECK` constraints |
| `nullable`, `unique`, `index`, `default`, `is_email` | Partial or expression indexes (`WHERE deleted_at IS NULL`, `lower(email)`) |
| `indexes` and `uniques` on multiple columns | Exclusion constraints, range types |
| Relationships: OneToMany, ManyToOne, OneToOne, ManyToMany, self-references, `to_name`, `nullable`, `index` | `ON DELETE SET NULL` or explicit `RESTRICT` (only `cascadeDelete: true` or the default) |
| `cascadeDelete: true` emits `ON DELETE CASCADE` | Payload columns on an implicit ManyToMany join table |
| ManyToMany join table and column names | Composite FKs (e.g. `(tenant_id, project_id)`) |
| `created_at`, `updated_at` flags | Version column for optimistic locking |
| `scopeBy` (API-level tenant guard) | Views, materialized views, triggers |
| `emitEvents` (transactional outbox, built in) | Schema-per-tenant or database-per-tenant |
| `table` override for reserved words | |

Notes to verify before this goes into a skill:
- `json` generates a Postgres `jsonb` column in the TypeScript entity template; `json-plain` generates `json`. The CLI's canonical type map (used by the migration sandbox) still lists `json` as `json`, so the two disagree. Worth a CLI fix.
- `array` generates a real Postgres array (`text[]` by default, or `elementType`). It is fine for small value lists, but not for references to other rows, which need a junction entity.
- `serial` is on the Postgres "Don't Do This" list (identity columns are preferred). It works, but `uuid` is the better default until Apso supports identity.

Support legend: **Full** = `.apsorc` expresses it. **Partial** = expressible with a workaround that loses a database guarantee (named in the cell). **None** = can't be expressed in `.apsorc`; needs a hand-written migration or app code, or isn't available.

Coverage: the skill that teaches it today, or **gap**.

## 1. Keys and identity

| Pattern | Postgres shape | `.apsorc` encoding | Support | Coverage |
|---|---|---|---|---|
| Surrogate key | `id` identity or uuid PK | `primaryKeyType: "uuid"` (or `serial`) | Full (no identity column) | schema-designer |
| Natural key as alternate key | Surrogate PK + `UNIQUE` on business key | `"unique": true` or `uniques: [{fields: [...]}]` | Partial: no case-insensitive unique (`lower(email)`) | schema-designer |
| Time-ordered UUID (v7/ULID) | `uuid DEFAULT uuidv7()` | `uuid` PK; v7 depends on generator | Partial: generator is not configurable from `.apsorc` (unverified) | gap |
| Composite key on junction/child | `PRIMARY KEY (a_id, b_id)` | ManyToMany join table gets one implicitly; explicit entities need surrogate PK + `uniques` on the pair | Partial | schema-designer |
| Public id vs internal id | bigint PK + `public_id` UNIQUE | Use `uuid` PK; a separate public id field is rarely needed | Full | gap (guidance only) |

## 2. Relationships

| Pattern | Postgres shape | `.apsorc` encoding | Support | Coverage |
|---|---|---|---|---|
| One-to-many FK | `parent_id REFERENCES parent ON DELETE ...` + index | `ManyToOne` / `OneToMany`, `index: true`, `cascadeDelete` | Partial: no SET NULL; FK index needs `index: true` | schema-designer |
| Many-to-many association table | Junction with composite PK | `ManyToMany` (+ `joinTableName`) | Full | schema-designer, auth-entities |
| Junction with payload (associative entity) | Junction entity with role, timestamps, `UNIQUE(a, b)` | Explicit entity, two `ManyToOne`, `uniques` on the pair | Full | auth-entities (Membership) |
| One-to-one split table | `child.parent_id` PK=FK | `OneToOne` | Partial: separate PK plus unique FK, not PK=FK | gap |
| Dependent mapping (owned children) | Child FK `ON DELETE CASCADE` | `ManyToOne` + `cascadeDelete: true` | Full | schema-designer |
| Self-referencing | `parent_id REFERENCES same(id)`, `CHECK (parent_id <> id)` | Self `ManyToOne` with `to_name` | Partial: no self-cycle CHECK | hierarchical-data |
| Polymorphic target done right | Exclusive arc with `CHECK (num_nonnulls(...) = 1)`, per-parent junctions, or common supertable | Per-parent junction entities (Full); exclusive arc as nullable FKs (Partial: no CHECK); supertable via `OneToOne` | Partial | file-storage (exclusive arc), tagging-taxonomy (per-type `ManyToMany`). Fixed 10-22; both used to default to `entityType` + `entityId` |

## 3. Hierarchies

| Pattern | Postgres shape | `.apsorc` encoding | Support | Coverage |
|---|---|---|---|---|
| Adjacency list (default) | `parent_id` self-FK + recursive CTE | Self `ManyToOne`, `to_name: "parent"`, `index: true` | Full (recursive queries need a custom endpoint) | hierarchical-data |
| Closure table | `(ancestor_id, descendant_id, depth)` | Entity with two `ManyToOne` to the node + `uniques` | Partial: maintenance logic is app code | **gap** |
| Materialized path | `path ltree` + GiST | `text` path field + `index` | Partial: no ltree, prefix queries need custom code | hierarchical-data, tagging-taxonomy |
| Nested sets | `lft`, `rgt` | Two integer fields | Partial; not recommended for edited trees | not taught (correct) |
| Organization hierarchy / accountability | Typed, time-bound party links | Entity with two `ManyToOne` to party + type + dates | Partial: no range types | gap (B2B only) |

## 4. Inheritance (supertype/subtype)

| Pattern | Postgres shape | `.apsorc` encoding | Support | Coverage |
|---|---|---|---|---|
| Single table | `kind` + nullable subtype columns + per-kind CHECKs | `enum` kind + nullable fields | Partial: no per-kind CHECK, so required subtype fields can't be enforced | **gap** |
| Class table (supertype + subtype tables) | Subtype PK = FK to supertype | Supertype entity + subtype entities with `OneToOne` | Partial: separate PK, disjointness not enforced | **gap** |
| Concrete table | One full table per subtype | Separate entities | Full | gap (guidance only) |

## 5. Temporal and history

| Pattern | Postgres shape | `.apsorc` encoding | Support | Coverage |
|---|---|---|---|---|
| Audit columns | `created_at`, `updated_at` timestamptz, `created_by` | `created_at: true`, `updated_at: true`, `ManyToOne` to User for actor | Full (check the column type is timestamptz) | audit-trail |
| Effective dating (valid time) | `valid_during tstzrange` + `WITHOUT OVERLAPS` or exclusion constraint | `validFrom` / `validTo` timestamptz fields | Partial: overlaps not prevented | **gap** |
| Versioned rows (temporal object, SCD-2 in OLTP) | Identity table + `entity_version(entity_id, version, valid_during)` | Two entities, `uniques` on `(entityId, version)` | Partial: "one current version" needs a partial unique index | **gap** |
| System-time history table | `table_history` filled by trigger | History entity; writes in custom code or via `emitEvents` | Partial | audit-trail (verify) |
| Bitemporal | Valid + recorded ranges | Four timestamptz fields | Partial; rarely needed | not taught (correct) |
| Audit log | Append-only `audit_log(entity_type, entity_id, before, after)` | Entity with `json` fields | Full (polymorphic ref is deliberate here) | audit-trail |
| Status history | Current status + `status_history` rows | `enum` status + history entity | Full | workflow-state |

## 6. Integrity and constraints

| Pattern | Postgres shape | `.apsorc` encoding | Support | Coverage |
|---|---|---|---|---|
| Lookup / reference table | `status(code PK, label, sort_order)` + FK | Lookup entity + `ManyToOne` | Partial: lookup gets a surrogate PK, not `code` PK | gap (guidance only) |
| CHECK or enum for fixed sets | `CHECK (status IN (...))` | `enum` with `values` | Full (as enum) | all skills |
| Type table (knowledge level) | Type entities with rule tables | Entities + `ManyToOne` | Full | gap (CRM-type apps) |
| Partial unique index | `UNIQUE ... WHERE deleted_at IS NULL` | Not expressible | **None** | **gap**; matters for soft-delete |
| Exclusion constraint | `EXCLUDE USING gist` | Not expressible | **None** | gap (bookings, schedules) |
| NOT NULL by default, CHECK for rules | `NOT NULL`, `CHECK (qty > 0)` | `nullable: false` (default); no CHECK | Partial | schema-review |

## 7. Multi-tenancy

| Pattern | Postgres shape | `.apsorc` encoding | Support | Coverage |
|---|---|---|---|---|
| Shared schema, tenant_id | `tenant_id` on every table, composite FKs, indexes lead with tenant | `scopeBy`, tenant FK, `indexes` leading with tenant | Partial: API-level guard, no composite FK backstop | multi-tenancy |
| Schema per tenant | One schema per tenant | Not expressible | **None** | not applicable |
| Database per tenant | One DB per tenant | One Apso service per tenant (platform, not schema) | **None** in `.apsorc` | gap (say so in multi-tenancy skill) |

## 8. Money and quantities

| Pattern | Postgres shape | `.apsorc` encoding | Support | Coverage |
|---|---|---|---|---|
| Money as amount + currency | `numeric(19,4)` or integer minor units + `currency` | `decimal` with `precision`/`scale`, or `integer` cents; `currency` text `length: 3` | Partial: no currency-code CHECK | billing-subscription (decimal; minor units not taught) |
| Embedded value | Column group or range type | Column group | Full | gap (guidance only) |
| Quantity with unit of measure | `quantity` + `uom` FK + conversion table | Fields + lookup entity | Full | gap (inventory apps) |
| Price snapshot on lines | Copy unit price onto order line | Fields on line entity | Full | **gap** (no order/invoice skill) |

## 9. Flexible attributes

| Pattern | Postgres shape | `.apsorc` encoding | Support | Coverage |
|---|---|---|---|---|
| JSON column (serialized LOB) | `metadata jsonb` | `json` / `json-plain` field | Partial: stored as `jsonb`, but `.apsorc` cannot declare a GIN index | file-storage, audit-trail, billing |
| Custom field definitions | Definition table + values in `jsonb` validated by app | Definition entity + `json` field on target | Partial | **gap** |
| Settings / key-value | Typed settings row, or `(scope, key, value)` | Settings entity with `OneToOne`, or key-value entity + `uniques` | Full | notification-system (preferences only) |
| EAV (pivoting, attribute-value) | `(entity_id, attr_id, value)` + attribute lookup | Expressible but avoid | Full (discouraged) | schema-review should flag it |

## 10. Ordering

| Pattern | Postgres shape | `.apsorc` encoding | Support | Coverage |
|---|---|---|---|---|
| Position column | `position int`, `UNIQUE (list_id, position) DEFERRABLE` | `integer` + `uniques` | Partial: not deferrable, so swaps need a temp value | hierarchical-data, tagging-taxonomy, workflow-state |
| Fractional rank | `rank text COLLATE "C"` | `text` + index | Partial: collation not settable | gap |
| Per-parent sequence number | `UNIQUE (tenant_id, number)` + counter row | `integer` + `uniques` + counter entity; increment in custom code | Partial | **gap** (invoice numbers) |

## 11. Concurrency and reliability

| Pattern | Postgres shape | `.apsorc` encoding | Support | Coverage |
|---|---|---|---|---|
| Optimistic locking | `version int` checked on update | Not expressible as a version column | **None** | gap |
| Idempotency keys | `UNIQUE (user_id, key)` + stored response | Entity + `uniques`; logic in custom endpoint | Partial | custom-endpoints |
| Transactional outbox | Outbox table written in same transaction | `emitEvents: true` | Full (built in) | domain-events |
| Job / queue table | `FOR UPDATE SKIP LOCKED` | Entity; worker is outside Apso | Partial | gap |

## 12. Domain models (Silverston, Hay, Fowler)

Offer these for CRM, B2B and commerce apps only. For most SaaS apps a plain User + Organization is enough.

| Pattern | `.apsorc` encoding | Support | Coverage |
|---|---|---|---|
| Party (Person / Organization supertype) | Class-table inheritance via `OneToOne` | Partial | gap |
| Party role, party relationship | Entities with `ManyToOne` + type + validity dates | Partial: no range types | gap |
| Contact mechanism | Entity + purpose + `isPrimary` | Partial: "one primary" needs a partial unique index | gap |
| Product / variant / inventory item | Entities | Full | gap |
| Order / order line (header-detail) | Order + line with `cascadeDelete`, price snapshot | Full | **gap** |
| Agreement / contract terms | Entities + validity dates | Partial | billing-subscription (subscriptions only) |

## 13. Cross-cutting app patterns

| Pattern | `.apsorc` encoding | Support | Coverage |
|---|---|---|---|
| Soft delete | `deletedAt` timestamptz nullable | Partial: unique-among-live-rows needs a partial index Apso can't emit | soft-delete (check that it states this) |
| Archive table instead of soft delete | Archive entity with `json` data | Full | gap (alternative not offered) |
| Tagging | Tag entity + per-type junctions or `ManyToMany` | Full | tagging-taxonomy |
| Comments, threaded | Comment + self `ManyToOne` + per-parent link | Full | gap |
| Reactions / likes as rows | Entity + `uniques` on (target, user) | Full | gap (shared reference covers "events not counters") |
| Counter cache | `integer` field maintained in custom code | Partial | data-modeling-principles |
| File metadata | File entity with storage key, checksum, status | Full | file-storage |
| Membership + roles (RBAC), invitations | Membership junction entity + role enum; Invitation entity with token hash | Full | auth-entities (invitations missing) |

## Anti-patterns schema-review should flag

| Anti-pattern | Fix | Detectable from `.apsorc`? |
|---|---|---|
| Jaywalking (id lists in one column) | Junction entity | Yes: `array` or text fields with an `Ids` suffix |
| Multicolumn attributes (`tag1`, `tag2`) | Child entity | Yes: numbered field names |
| Keyless entry (`*Id` text field with no relationship) | Declare a relationship | Yes |
| Polymorphic associations without FK | Per-parent junction or exclusive arc | Yes: `*Type` + `*Id` pairs |
| EAV | Real columns or `json` | Yes: attribute/value entity shape |
| Metadata tribbles (`orders2024`, `revenueQ1`) | One entity + a column | Yes: numbered or dated entity names |
| Rounding errors (`float` money) | `decimal` or integer cents | Yes |
| 31 flavors (enum for user-editable values) | Lookup entity | Partly (needs domain judgment) |
| God table / mixed entity types | Split entities | Partly (field count, many nullables) |
| Unjustified optionality | `nullable: false` | Partly |
| Missing index on FK or filter column | `index: true` | Yes for FKs |
| Password stored outside BetterAuth's Account | Use auth entities | Yes |

## Findings

1. **Polymorphic conflict: fixed 10-22.** file-storage now defaults to a real foreign key, then an exclusive arc of nullable foreign keys, and keeps `entityType` + `entityId` only as a stated exception. tagging-taxonomy facets use a per-type `ManyToMany`.
2. **Biggest pattern gaps** (common in SaaS, no skill today):
   - Order / invoice header-detail with price snapshot and per-tenant numbering.
   - Inheritance (single table vs supertype/subtype).
   - Effective dating and versioned rows (pricing, plans, contracts).
   - Custom fields.
   - Comments and reactions as rows.
3. **Apso capability gaps that block good designs.** These are CLI features, not skill content, and are worth raising on the CLI roadmap:
   - Partial unique indexes (soft delete, "one primary per X").
   - CHECK constraints (exclusive arc, single-table inheritance, positive quantities).
   - `ON DELETE SET NULL`.
   - GIN indexes on `jsonb`.
   - Duplicate relationship sides: `apso schema validate` passes `A OneToMany B` plus `B ManyToOne A`, which generates the relationship twice.
   - `json` maps to `jsonb` in entities but `json` in the migration type map.
   - A version column for optimistic locking.
   - Identity PKs instead of `serial`.
4. **Skills must say what Apso can't do.** When a pattern needs a CHECK or partial index, the skill should encode the closest `.apsorc` form and state the missing guarantee, rather than silently dropping it.

## Proposed next steps

1. ~~Resolve the polymorphic conflict in file-storage and tagging-taxonomy.~~ Done 10-22.
2. ~~Turn this catalog into `references/relational-patterns.md`.~~ Done 10-22, loaded by schema-designer and schema-review; eval case schema-designer-invoicing.
3. Add skills for the gaps in finding 2, in this order: order-invoice, inheritance, effective-dating, custom-fields, comments-reactions.
4. Add schema-review checks for the detectable anti-patterns.
5. Add one eval case per new skill and per anti-pattern check, using the design and encoding grader split.
6. File the CLI capability gaps from finding 3.
