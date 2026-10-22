# Canonical Relational Design Patterns (Postgres, OLTP)

Catalog of relational schema patterns for guiding an AI schema designer. Scope is OLTP application schemas on PostgreSQL.

**Out of scope:** document/NoSQL modeling, graph stores, event sourcing as a storage engine, sharding/replication infrastructure, and warehouse modeling (Kimball star/snowflake). SCD Type 2 appears below only in its OLTP form (row-versioned history tables).

## Source key

Verification legend: **[V]** = fetched or confirmed by search this session. **[NF]** = well-known URL or book I did not fetch this session; check it before quoting.

| Key | Source | Status |
|---|---|---|
| K | Bill Karwin, *SQL Antipatterns, Volume 1* (Pragmatic, 2022). TOC: https://pragprog.com/titles/bksap1/sql-antipatterns-volume-1/ | [V] chapter list. Fix details below are from the book's well-known content, chapter text not fetched |
| K-PA | Karwin, Polymorphic Associations chapter, O'Reilly preview: https://www.oreilly.com/library/view/sql-antipatterns/9781680500073/f_0048.html | [V] via search |
| K-H | Karwin, "Models for Hierarchical Data" deck: https://www.slideshare.net/slideshow/models-for-hierarchical-data/4179181 | [V] title and four models; slides not read |
| F | Fowler, *PoEAA* catalog: https://martinfowler.com/eaaCatalog/ (pattern pages are `/eaaCatalog/<name>.html`) | [V] |
| F-T | Fowler, "Patterns for things that change with time": https://martinfowler.com/eaaDev/timeNarrative.html ; https://martinfowler.com/eaaDev/AuditLog.html ; `/eaaDev/Effectivity.html`, `/TemporalProperty.html`, `/TemporalObject.html`, `/Snapshot.html`, `/Range.html` | [V] narrative, AuditLog, Range |
| F-A | Fowler, *Analysis Patterns* ch. 2 Accountability (Party, Accountability, Knowledge Level, Organization Hierarchy): https://martinfowler.com/apsupp/accountability.pdf | [V] |
| S | Len Silverston, *The Data Model Resource Book, Vol. 1* (Wiley, rev. ed. 2001, ISBN 978-0471380238). Listing: https://campusstore.miamioh.edu/data-model-resource-book-volume-1-library/bk/9780471380238 | [V] bibliographic + party role/relationship sections. Model specifics are from the book, not fetched |
| H | David C. Hay, *Data Model Patterns: Conventions of Thought* (Dorset House, 1996, ISBN 0-932633-29-3). Review: https://tdan.com/?p=5561 | [V] bibliographic. Model specifics not fetched |
| SN | Richard Snodgrass, *Developing Time-Oriented Database Applications in SQL* (Morgan Kaufmann, 1999), author PDF: https://smsf.cs.arizona.edu/~rts/tdbbook.pdf | [V] exists; covers valid-time, transaction-time, bitemporal tables |
| PG-CT | Postgres 18 CREATE TABLE (temporal `WITHOUT OVERLAPS` PK/UNIQUE, `PERIOD` FK): https://www.postgresql.org/docs/18/sql-createtable.html | [V] |
| PG-UUID | Postgres 18 `uuidv7()`: https://www.postgresql.org/docs/18/functions-uuid.html | [V] |
| PG-DONT | Postgres wiki "Don't Do This": https://wiki.postgresql.org/wiki/Don't_Do_This | [V] |
| PG-LT | Postgres `ltree`: https://www.postgresql.org/docs/current/ltree.html | [V] |
| PG-RLS | Postgres row security: https://www.postgresql.org/docs/current/ddl-rowsecurity.html | [NF] |
| PG-EX | Postgres exclusion constraints / partial indexes / enums: https://www.postgresql.org/docs/current/ddl-constraints.html , https://www.postgresql.org/docs/current/indexes-partial.html , https://www.postgresql.org/docs/current/datatype-enum.html | [NF] |
| AZ | Microsoft, Multitenant SaaS database tenancy patterns: https://learn.microsoft.com/en-us/azure/azure-sql/database/saas-tenancy-app-design-patterns | [V] |
| CITUS | Citus multi-tenant guide: https://docs.citusdata.com/en/stable/use_cases/multi_tenant.html | [V] |
| OUTBOX | Chris Richardson, Transactional Outbox: https://microservices.io/patterns/data/transactional-outbox.html | [V] |
| IDEM | Brandur Leach, "Implementing Stripe-like Idempotency Keys in Postgres": https://brandur.org/idempotency-keys | [V] |
| SOFT | Brandur Leach, "Soft Deletion Probably Isn't Even That Good": https://brandur.org/soft-deletion | [V] |

---

## 1. Keys & identity

**1.1 Surrogate key (Identity Field)**
- Problem: rows need a stable, immutable identity independent of business data.
- Shape: `id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY` (or `uuid`). Never use `serial` on PG10+ (PG-DONT).
- Use: default for every entity table.
- Avoid/tradeoff: a surrogate alone does not prevent duplicates; always pair with a UNIQUE on the natural key (1.2).
- Antipattern: ID Required (8.3), Pseudokey Neat-Freak (gap-filling ids).
- Sources: F `identityField.html`; PG-DONT; K.

**1.2 Natural key as alternate key**
- Problem: business uniqueness (email per tenant, SKU, ISO code) must be enforced.
- Shape: `UNIQUE (tenant_id, lower(email))` via unique index on expression; or natural PK for stable code tables (`currency(code char(3) PK)` with CHECK, per PG-DONT prefer `text` + CHECK).
- Use: every entity that has a real-world identifier; natural PK only when the value never changes (ISO codes).
- Avoid: natural PK when the value can be edited (emails, names), since updates cascade through FKs.
- Antipattern: Keyless Entry (8.4) when omitted.
- Sources: K; PG-DONT.

**1.3 Time-ordered UUID (UUIDv7 / ULID)**
- Problem: ids must be generated outside the DB, be non-guessable-ish, and not fragment B-tree indexes like random UUIDv4.
- Shape: `id uuid PRIMARY KEY DEFAULT uuidv7()` (native in PG18); ULID stored as `uuid` or `text` on older versions.
- Use: client-generated ids, public ids in URLs, merging data across databases, offline sync.
- Avoid: when id size matters (16 bytes vs 8) or when leaking creation time is unacceptable (v7 embeds a millisecond timestamp).
- Sources: PG-UUID.

**1.4 Composite key for association/child rows**
- Problem: a dependent or junction row is identified by its parents.
- Shape: `PRIMARY KEY (order_id, line_no)` or `PRIMARY KEY (post_id, tag_id)`.
- Use: junction tables without payload; weak entities.
- Avoid: when other tables must reference the row often (add a surrogate plus UNIQUE on the pair).
- Antipattern: ID Required (adding `id` to a junction and dropping the unique pair, which allows duplicates).
- Sources: K; F `associationTableMapping.html`.

**1.5 Public id vs internal id**
- Problem: exposing sequential ids leaks volume and invites enumeration.
- Shape: internal `bigint` PK for joins; `public_id uuid/text UNIQUE NOT NULL` for APIs.
- Use: customer-facing APIs with bigint PKs.
- Avoid: when the PK is already UUIDv7 (redundant).
- Sources: common practice; no single canonical source verified.

---

## 2. Relationships

**2.1 Foreign Key Mapping (one-to-many)**
- Problem: link a child to its parent with enforced integrity.
- Shape: `child.parent_id bigint NOT NULL REFERENCES parent(id) ON DELETE {RESTRICT|CASCADE|SET NULL}`; index on `parent_id` (Postgres does not auto-index FK columns).
- Use: every one-to-many.
- Avoid: none; choose the ON DELETE action deliberately (CASCADE for owned children, RESTRICT for referenced records).
- Antipattern: Keyless Entry.
- Sources: F `foreignKeyMapping.html`; K.

**2.2 Association table (many-to-many)**
- Problem: many-to-many links.
- Shape: `post_tag(post_id FK, tag_id FK, PRIMARY KEY(post_id, tag_id))` plus index on `(tag_id, post_id)` for reverse lookups.
- Use: any M:N.
- Avoid: storing ids in a delimited string or array (Jaywalking).
- Antipattern: Jaywalking, Multicolumn Attributes.
- Sources: F `associationTableMapping.html`; K.

**2.3 Junction table with payload (associative entity)**
- Problem: the relationship itself has attributes (role, joined_at, quantity).
- Shape: `membership(id, workspace_id FK, user_id FK, role text NOT NULL, created_at, UNIQUE(workspace_id, user_id))`.
- Use: memberships, enrollments, assignments; promote to a full entity once it has its own lifecycle or children.
- Avoid: when the payload is time-varying; then it becomes an effectivity/history table (5.2).
- Sources: F `associationTableMapping.html`; S (party relationship as entity).

**2.4 One-to-one split table**
- Problem: optional, large, sensitive, or rarely read columns bloat the main row.
- Shape: `user_profile(user_id PK REFERENCES users(id) ON DELETE CASCADE, ...)`; PK = FK enforces 1:1.
- Use: separating PII/secrets, wide optional blocks, different write rates.
- Avoid: splitting for no reason; it adds a join to every read.
- Sources: general practice; supports F Class Table Inheritance shape.

**2.5 Dependent Mapping (owned children)**
- Problem: child rows have no meaning outside the parent (order lines, invoice items).
- Shape: child FK with `ON DELETE CASCADE`; often composite PK `(parent_id, line_no)`; written and read only through the parent.
- Use: aggregate-internal collections.
- Avoid: when other aggregates reference the child.
- Sources: F `dependentMapping.html`.

**2.6 Self-referencing relationship**
- Problem: an entity relates to another of the same type (manager, parent category, replied-to comment).
- Shape: `employee.manager_id REFERENCES employee(id)`; `CHECK (manager_id <> id)`.
- Use: single-parent hierarchies (see 3.1); M:N self links use a junction `(from_id, to_id)` with CHECK `from_id <> to_id`.
- Sources: K (adjacency list).

**2.7 Polymorphic target done right (exclusive arc / per-parent junction / common supertable)**
- Problem: a comment/attachment/tag belongs to one of several parent types.
- Shape (a) exclusive arc: `comment(post_id FK NULL, photo_id FK NULL, CHECK (num_nonnulls(post_id, photo_id) = 1))`. (b) per-parent junction: `post_comment(post_id, comment_id)`, `photo_comment(photo_id, comment_id)`. (c) common supertable: `commentable(id)` referenced by `post.id` and `photo.id` as PK=FK; `comment.commentable_id REFERENCES commentable(id)`.
- Use: (a) for 2 to 4 parent types; (c) when parent types grow.
- Avoid: `parent_type text, parent_id bigint` with no FK.
- Antipattern: Polymorphic Associations (8.6).
- Sources: K-PA; K.

---

## 3. Hierarchies

**3.1 Adjacency list**
- Problem: tree structure.
- Shape: `parent_id REFERENCES same_table(id)`, index on `parent_id`; subtree queries via `WITH RECURSIVE`.
- Use: default in Postgres; recursive CTEs make Karwin's original objection (no subtree query) much weaker.
- Avoid: very deep trees with hot subtree reads; cycle prevention needs a trigger or app check.
- Antipattern: Naive Trees refers to adjacency list without recursive query support.
- Sources: K; K-H.

**3.2 Closure table**
- Problem: fast ancestor/descendant queries and multiple-depth lookups.
- Shape: `node_closure(ancestor_id FK, descendant_id FK, depth int, PRIMARY KEY(ancestor_id, descendant_id))`; index `(descendant_id)`; includes self-rows at depth 0.
- Use: heavy read of subtrees/ancestors, permissions inheritance, category trees.
- Avoid: write-heavy trees with frequent subtree moves (O(subtree x ancestors) rows rewritten); storage is O(n x depth).
- Sources: K; K-H.

**3.3 Materialized path (path enumeration)**
- Problem: subtree queries by prefix with simple writes.
- Shape: `path ltree NOT NULL` with GiST index; query `path <@ 'root.a'`.
- Use: Postgres with `ltree`; breadcrumbs; moderate depth.
- Avoid: no FK integrity on path segments; moving a subtree rewrites all descendant paths.
- Sources: K (Path Enumeration); PG-LT.

**3.4 Nested sets**
- Problem: subtree reads in one range scan.
- Shape: `lft int, rgt int` with `CHECK (lft < rgt)`.
- Use: rarely; read-only or near-static trees.
- Avoid: any frequently edited tree (inserts renumber large parts of the table). Generally not recommended for OLTP apps.
- Sources: K; K-H.

**3.5 Organization hierarchy / Accountability**
- Problem: org structures change over time and have multiple hierarchy types (reporting, billing, regional).
- Shape: `party`, `accountability(id, type_id FK, commissioner_id FK party, responsible_id FK party, valid_during tstzrange)`, `accountability_type(id, name)`.
- Use: B2B org charts, reseller/agency/client trees, multiple simultaneous hierarchies.
- Avoid: simple single-tree orgs; use 3.1.
- Sources: F-A; S (party relationship).

---

## 4. Inheritance / supertype-subtype

**4.1 Single Table Inheritance**
- Problem: map a type hierarchy to one table.
- Shape: one table with `kind text NOT NULL CHECK (kind IN (...))`, union of subtype columns as nullable, plus per-kind CHECKs (`CHECK (kind <> 'card' OR card_last4 IS NOT NULL)`).
- Use: few subtypes, mostly shared columns, frequent polymorphic queries.
- Avoid: many subtype-specific columns (wide sparse rows, weak NOT NULL enforcement).
- Sources: F `singleTableInheritance.html`.

**4.2 Class Table Inheritance (supertype/subtype tables)**
- Problem: hierarchy with substantial subtype-specific data and enforced integrity.
- Shape: `party(id PK, kind)`; `person(party_id PK REFERENCES party(id), ...)`; `organization(party_id PK REFERENCES party(id), ...)`. Optional `UNIQUE(id, kind)` on supertype and `(party_id, kind)` FK with `CHECK (kind='person')` on subtype to enforce disjointness.
- Use: Party/Person/Organization, Payment/CardPayment/BankPayment; other tables FK the supertype.
- Avoid: when subtypes share almost nothing (use 4.3) or almost everything (use 4.1).
- Sources: F `classTableInheritance.html`; S.

**4.3 Concrete Table Inheritance**
- Problem: subtypes are queried separately and share little.
- Shape: one full table per concrete class, no supertype table; ids unique across tables only if drawn from a shared sequence/UUID.
- Use: rarely polymorphic queries.
- Avoid: when anything needs an FK to "any subtype" (no target table). Do not use Postgres native table `INHERITS` for this (PG-DONT).
- Sources: F `concreteTableInheritance.html`; PG-DONT.

---

## 5. Temporal / history

**5.1 Audit columns**
- Problem: who/when created and last changed a row.
- Shape: `created_at timestamptz NOT NULL DEFAULT now()`, `updated_at timestamptz NOT NULL DEFAULT now()` (set by trigger or app), optional `created_by`, `updated_by` FK users.
- Use: every mutable table.
- Avoid: treating these as history; they only hold the last change. Use `timestamptz`, never `timestamp` (PG-DONT).
- Sources: PG-DONT; general practice.

**5.2 Effectivity / valid-time (effective dating)**
- Problem: a fact is true for a period (price, plan assignment, address, role).
- Shape: `price(product_id, valid_during tstzrange NOT NULL, amount numeric, PRIMARY KEY (product_id, valid_during WITHOUT OVERLAPS))` on PG18; pre-18 use `EXCLUDE USING gist (product_id WITH =, valid_during WITH &&)` with `btree_gist`. Half-open ranges `[start, end)`.
- Use: anything with future-dated or historical changes that queries ask "as of date X".
- Avoid: when only current value matters. Temporal FKs (`PERIOD`) do not support CASCADE/SET NULL.
- Sources: F-T (Effectivity, Range); SN; PG-CT.

**5.3 Temporal Property / Temporal Object (versioned rows, SCD-2 in OLTP)**
- Problem: keep every version of an entity and query it as of a date.
- Shape: `entity(id PK)` identity table + `entity_version(entity_id FK, version int, valid_during tstzrange, ...attrs, PRIMARY KEY(entity_id, version))`; current view = `WHERE upper_inf(valid_during)`, enforced by a partial unique index `ON (entity_id) WHERE upper_inf(valid_during)`.
- Use: contracts, pricing plans, policies, anything legally versioned; snapshotting what an invoice referenced.
- Avoid: high-churn rows; every update becomes insert + close.
- Sources: F-T (TemporalProperty, TemporalObject, Snapshot); SN.

**5.4 System-time (transaction-time) history table**
- Problem: record what the database believed and when, independent of business validity.
- Shape: main table + `table_history` with same columns plus `sys_period tstzrange`; trigger copies the old row on UPDATE/DELETE. Postgres has no native SQL:2011 system versioning in core.
- Use: compliance, debugging, "what did we show the customer on date X".
- Avoid: as a substitute for valid-time when users need to correct the past.
- Sources: SN; F-T ("record time").

**5.5 Bitemporal**
- Problem: track both when a fact was true (actual/valid time) and when it was recorded (record/transaction time), e.g. a raise effective Feb 15 recorded Mar 15.
- Shape: version rows with `valid_during` and `recorded_during` ranges; corrections close the recorded range and insert new rows.
- Use: finance, payroll, insurance, retroactive corrections.
- Avoid: most SaaS apps; complexity is high. Default to 5.2 or 5.4.
- Sources: F-T (Dimensions of Time); SN.

**5.6 Audit Log table**
- Problem: record significant changes for occasional lookup without changing the main model.
- Shape: `audit_log(id, occurred_at timestamptz, actor_id, tenant_id, entity_type text, entity_id, action text, before jsonb, after jsonb)`; index `(tenant_id, entity_type, entity_id, occurred_at)`. Append-only (revoke UPDATE/DELETE).
- Use: user-visible activity feeds, admin audit trails, SOC2 evidence.
- Avoid: as the source of truth for current state; not queryable relationally. `entity_type/entity_id` is a deliberate polymorphic reference without FK, acceptable here because rows must outlive their targets.
- Sources: F-T (AuditLog).

**5.7 Status history**
- Problem: entities move through states and you need when each transition happened and who did it.
- Shape: `order.status` (current, FK to status lookup or CHECK) + `order_status_history(order_id FK, status, changed_at, changed_by, reason)`; optionally `valid_during`.
- Use: orders, tickets, deployments, approvals.
- Avoid: only the current status matters and audit_log covers it.
- Sources: S (status entities); H; F-T.

---

## 6. Integrity & constraints

**6.1 Lookup / reference table**
- Problem: a constrained set of values that may grow, needs metadata (label, sort order, active flag), or is tenant-configurable.
- Shape: `order_status(code text PK, label text, sort_order int, is_active bool)`; `order.status text REFERENCES order_status(code)`.
- Use: values changed by admins or users without a migration; values that carry attributes.
- Avoid: tiny fixed sets that are part of code logic (use CHECK).
- Antipattern: 31 Flavors.
- Sources: K.

**6.2 CHECK-constrained text (or native enum) for fixed sets**
- Problem: small, code-coupled value sets.
- Shape: `status text NOT NULL CHECK (status IN ('draft','sent','paid'))`. Native `CREATE TYPE ... AS ENUM` works but values cannot be removed or easily reordered.
- Use: state machines owned by code.
- Avoid: sets that business users edit; prefer CHECK over native enum when values may be removed.
- Antipattern: 31 Flavors (Karwin's critique of enum/CHECK for changeable sets).
- Sources: K; PG-EX.

**6.3 Classification / Type table (Knowledge Level)**
- Problem: the set of "kinds" (product types, party roles, relationship types) is data, with rules attached.
- Shape: `party_role_type(id, name, parent_type_id)`; instance table FKs the type; rules (allowed relationship pairs) in a rule table `(rel_type_id, from_role_type_id, to_role_type_id)`.
- Use: configurable CRMs, ERPs, multi-domain platforms.
- Avoid: when types drive different columns (then it is inheritance, section 4).
- Sources: F-A (Knowledge Level, Accountability Type); S; H.

**6.4 Partial unique index (conditional uniqueness)**
- Problem: uniqueness only among a subset (active rows, non-deleted rows, one default per user).
- Shape: `CREATE UNIQUE INDEX ON address(user_id) WHERE is_default`; `UNIQUE ON users(lower(email)) WHERE deleted_at IS NULL`.
- Use: soft delete + uniqueness, single "primary" child, one open period per entity.
- Sources: PG-EX.

**6.5 Exclusion constraint (no overlaps)**
- Problem: bookings, schedules, effective periods must not overlap.
- Shape: `EXCLUDE USING gist (room_id WITH =, during WITH &&)` with `btree_gist`; or PG18 `WITHOUT OVERLAPS`.
- Use: reservations, shifts, price periods.
- Sources: PG-CT; PG-EX.

**6.6 NOT NULL by default, CHECK for domain rules**
- Problem: invalid states enter via any client.
- Shape: NOT NULL unless absence is meaningful; CHECKs such as `quantity > 0`, `ends_at > starts_at`, `num_nonnulls(a,b)=1`.
- Use: everywhere; DB constraints protect against all writers.
- Antipattern: Fear of the Unknown (misuse of NULL), Diplomatic Immunity (treating DB code as exempt from engineering practices).
- Sources: K.

---

## 7. Multi-tenancy

**7.1 Shared schema with tenant_id (pool model)**
- Problem: many tenants, lowest per-tenant cost.
- Shape: `tenant_id NOT NULL REFERENCES tenant(id)` on every tenant-owned table; composite keys `PRIMARY KEY (tenant_id, id)` or `UNIQUE (tenant_id, id)`; composite FKs `FOREIGN KEY (tenant_id, project_id) REFERENCES project(tenant_id, id)` so cross-tenant references are impossible; every index leads with `tenant_id`. Shared reference data has no tenant_id.
- Use: default for SaaS with many small tenants.
- Avoid/tradeoff: low isolation, noisy neighbors, per-tenant restore is hard. Enforcement in the API layer (scope guards) or Postgres RLS (PG-RLS); composite FKs are the DB-level backstop.
- Sources: AZ; CITUS.

**7.2 Schema-per-tenant**
- Problem: stronger isolation and per-tenant customization in one database.
- Shape: identical table set in schema `tenant_123`; `search_path` per connection; migrations run N times.
- Use: tens to low thousands of tenants needing logical isolation or per-tenant extensions.
- Avoid: large tenant counts (catalog bloat, slow migrations). Not covered as a distinct model in AZ; [NF] for a canonical source.
- Sources: general practice.

**7.3 Database-per-tenant (silo)**
- Problem: maximum isolation, per-tenant restore, per-tenant schema customization, data residency.
- Shape: one database per tenant + a catalog DB mapping tenant to connection.
- Use: enterprise tiers, regulated customers, BYO-cloud deployments.
- Avoid: many small tenants (cost, migration fan-out). Hybrid: keep `tenant_id` in the schema anyway so tenants can move between pooled and dedicated DBs.
- Sources: AZ (database-per-tenant, hybrid model).

---

## 8. Antipatterns (Karwin, SQL Antipatterns Vol. 1, logical + physical design)

Source for all: K. Fixes reference patterns above.

**8.1 Jaywalking** — comma-separated ids in a text column. Breaks FKs, indexing, joins, and length limits. Fix: association table (2.2). Note: Postgres arrays have the same FK problem; acceptable only for tag-like values with no referential needs.

**8.2 Naive Trees** — adjacency list with no way to query subtrees. Fix: recursive CTE, closure table, path enumeration, nested sets (section 3).

**8.3 ID Required** — reflexively adding `id` to every table, including junctions, leading to duplicate pairs and confusing joins. Fix: natural/composite keys where appropriate, and always a UNIQUE on the real key (1.2, 1.4).

**8.4 Keyless Entry** — omitting FK constraints "for flexibility or speed". Fix: declare FKs (2.1); orphans and broken references follow without them.

**8.5 Entity-Attribute-Value** — `(entity_id, attr_name, attr_value text)` for flexible attributes. Loses types, NOT NULL, FKs, and readable queries. Fix: model real columns; subtype tables (4.2); a typed `jsonb` column with CHECK/JSON schema for truly user-defined fields (10.1).

**8.6 Polymorphic Associations** — `(parent_type, parent_id)` with no FK. Fix: exclusive arc, per-parent junction, or common supertable (2.7). Exception: append-only audit logs (5.6).

**8.7 Multicolumn Attributes** — `tag1, tag2, tag3` columns. Fix: dependent table (2.2/2.5).

**8.8 Metadata Tribbles** — cloning tables or columns per year/customer (`orders_2024`, `revenue_q1`). Fix: one table with a column for the variant; native partitioning when size demands it.

**8.9 Rounding Errors** — `float`/`real` for money or exact quantities. Fix: `numeric(p,s)` or integer minor units (section 9).

**8.10 31 Flavors** — enum/CHECK lists for values that change. Fix: lookup table (6.1).

**8.11 Phantom Files** — storing file paths outside the DB with no transactional link. Karwin's fix is to consider BLOBs. For SaaS, the common compromise is object storage + a `file` metadata row (`id, storage_key UNIQUE, size, content_type, sha256, status`) written transactionally with an outbox/cleanup job; this compromise is not from Karwin.

**8.12 Index Shotgun** — indexing everything or nothing without measurement. Fix: index FKs and actual query predicates, verify with `EXPLAIN`; Karwin's acronym is MENTOR (Measure, Explain, Nominate, Test, Optimize, Rebuild).

**8.13 Postgres-specific "Don't Do This" (PG-DONT)** — `money` type, `timestamp` without time zone, `char(n)`, default `varchar(n)`, `serial`, table inheritance, rules, `NOT IN`, `BETWEEN` on timestamps, uppercase identifiers. Fix: `numeric`, `timestamptz`, `text` + CHECK, identity columns, FKs/partitioning, triggers, `NOT EXISTS`, half-open `>= AND <`, snake_case.

Out of scope here (query/app antipatterns from K): Fear of the Unknown, Ambiguous Groups, Random Selection, Poor Man's Search Engine, Spaghetti Query, Implicit Columns, Readable Passwords, SQL Injection, Pseudokey Neat-Freak, See No Evil, Diplomatic Immunity, Standard Operating Procedures. Readable Passwords is schema-relevant: store `password_hash` (bcrypt/argon2), never plaintext or reversible encryption.

---

## 9. Money & quantities

**9.1 Money as amount + currency**
- Problem: exact arithmetic and no currency mixing.
- Shape: `amount_minor bigint NOT NULL` (cents) or `amount numeric(19,4)`, plus `currency char(3)`/`text CHECK (currency ~ '^[A-Z]{3}$')` REFERENCES currency(code). Never `float`, never the `money` type.
- Use: every monetary value; integer minor units match Stripe-style APIs.
- Avoid: single-currency assumption if any chance of multi-currency.
- Antipattern: Rounding Errors.
- Sources: F `money.html` (Money pattern); K; PG-DONT.

**9.2 Embedded Value (value object columns)**
- Problem: small value objects (money, address, date range) without their own identity.
- Shape: column group in the owner table (`total_amount`, `total_currency`) or a range type (`tstzrange`, `numrange`).
- Use: values never shared or referenced independently.
- Avoid: when the value is shared or has a lifecycle (make it a table).
- Sources: F `embeddedValue.html`; F-T (Range).

**9.3 Quantity with unit of measure**
- Problem: quantities in mixed units.
- Shape: `quantity numeric NOT NULL, uom_code REFERENCES unit_of_measure(code)`, conversion table `(from_uom, to_uom, factor)`.
- Use: inventory, metered billing, ERP.
- Sources: S (Product, unit of measure); H. Model details [NF].

**9.4 Price snapshot on transaction lines**
- Problem: catalog prices change; historical orders must keep the price charged.
- Shape: `order_line(order_id, line_no, product_id FK, unit_price_minor, currency, quantity, line_total_minor)`; price copied at order time, not joined live.
- Use: orders, invoices, quotes.
- Sources: S (Order/OrderItem); F-T (Snapshot).

---

## 10. Flexible attributes

**10.1 Serialized LOB / jsonb column**
- Problem: semi-structured or user-defined fields that are rarely queried relationally.
- Shape: `metadata jsonb NOT NULL DEFAULT '{}'`, `CHECK (jsonb_typeof(metadata) = 'object')`; GIN index only if queried by key.
- Use: integration payloads, per-tenant custom fields, settings blobs.
- Avoid: fields used in joins, FKs, uniqueness, or frequent filters; promote those to columns.
- Antipattern: EAV is the relational alternative it replaces; overusing jsonb recreates the same loss of constraints.
- Sources: F `serializedLOB.html`; K (EAV chapter).

**10.2 Custom field definitions (typed EAV with guardrails)**
- Problem: tenant-defined fields that must be validated and listed in UI.
- Shape: `custom_field(id, tenant_id, entity_type, key, data_type CHECK(...), required bool, UNIQUE(tenant_id, entity_type, key))` + values in `entity.custom jsonb` validated by app against the definitions.
- Use: CRMs, form builders.
- Avoid: when the fields are known at design time.
- Sources: derived from K (EAV) and F `serializedLOB.html`; no single canonical source.

**10.3 Settings / key-value config**
- Problem: per-tenant or per-user preferences.
- Shape: preferred: typed columns on `tenant_settings(tenant_id PK FK, ...)`. Flexible: `setting(scope_id, key text, value jsonb, PRIMARY KEY(scope_id, key))` with keys validated against a code-side registry.
- Use: typed columns for settings the app branches on; key-value for long-tail feature flags.
- Avoid: key-value for settings with relational meaning.
- Sources: general practice; related antipattern K EAV.

---

## 11. Ordering

**11.1 Position column**
- Problem: user-defined order of items within a parent.
- Shape: `position int NOT NULL`, `UNIQUE (list_id, position) DEFERRABLE INITIALLY DEFERRED` so reorders can swap within a transaction.
- Use: small lists (tens to hundreds).
- Avoid: large lists with frequent drag-and-drop (renumbering many rows).
- Sources: general practice; [NF] canonical source.

**11.2 Fractional / lexicographic rank**
- Problem: reorder by touching one row.
- Shape: `rank text COLLATE "C" NOT NULL` (fractional index / LexoRank-style strings) or `rank numeric`; index `(list_id, rank)`; periodic rebalance.
- Use: kanban boards, large reorderable lists, collaborative editing.
- Avoid: when 11.1 is enough.
- Sources: general practice; no primary source verified this session.

**11.3 Per-parent sequence number**
- Problem: human-readable numbering per tenant/parent (INV-0042, issue #17).
- Shape: `UNIQUE (tenant_id, number)`; counter row `tenant_counter(tenant_id, kind, next_value)` updated with `UPDATE ... RETURNING` in the same transaction. Global sequences leak and have gaps.
- Use: invoice numbers (often legally gapless), ticket numbers.
- Avoid: when gaps are acceptable and per-tenant numbering is not needed.
- Sources: general practice.

---

## 12. Concurrency

**12.1 Optimistic locking (version column)**
- Problem: lost updates when two users edit the same record.
- Shape: `version int NOT NULL DEFAULT 1`; `UPDATE ... SET version = version + 1 WHERE id = $1 AND version = $2`; zero rows = conflict.
- Use: edit forms, APIs with ETag/If-Match.
- Avoid: high-contention counters (use atomic `UPDATE x = x + 1` or row locks).
- Sources: F `optimisticOfflineLock.html`.

**12.2 Idempotency keys**
- Problem: client retries must not double-charge or double-create.
- Shape (IDEM): `idempotency_key(id, user_id FK, idempotency_key text CHECK(length <= 100), request_method, request_path, request_params jsonb, response_code int, response_body jsonb, recovery_point text, locked_at, last_run_at, created_at)`, `UNIQUE (user_id, idempotency_key)`; expire after ~24h by job. Simpler variant: unique `client_request_id` on the created row.
- Use: payments, provisioning, any non-idempotent POST.
- Sources: IDEM.

**12.3 Transactional outbox**
- Problem: write to DB and publish an event atomically without two-phase commit.
- Shape: `outbox(id bigint identity, aggregate_type, aggregate_id, event_type, payload jsonb, created_at, published_at timestamptz NULL)`; partial index `WHERE published_at IS NULL`; relay polls with `FOR UPDATE SKIP LOCKED` or uses logical decoding. Consumers must be idempotent (at-least-once).
- Use: webhooks, search indexing, cross-service events, emails.
- Sources: OUTBOX.

**12.4 Job/queue table**
- Problem: background work in the same DB.
- Shape: `job(id, queue, payload jsonb, run_at, attempts, locked_at, locked_by, status CHECK(...))`; index `(queue, run_at) WHERE status='pending'`; dequeue with `FOR UPDATE SKIP LOCKED`.
- Use: low to moderate job volume without extra infra.
- Sources: general practice ([NF]); closely related to OUTBOX.

---

## 13. Domain model patterns (Silverston / Hay / Fowler Analysis Patterns)

Model specifics in this section are from the books (S, H, F-A). F-A was confirmed; S and H chapter text was not fetched.

**13.1 Party (supertype of Person and Organization)**
- Problem: customers, vendors, employees, and contacts can be people or organizations, and one party plays many roles.
- Shape: Class Table Inheritance (4.2): `party(id, kind)`, `person(party_id PK FK, ...)`, `organization(party_id PK FK, ...)`.
- Use: CRMs, B2B platforms, marketplaces.
- Avoid: apps with only end users and a workspace; a plain `users` + `organizations` is enough.
- Sources: S; F-A (Party); H.

**13.2 Party Role**
- Problem: the same party is a customer, a supplier, and an employee over time.
- Shape: `party_role(id, party_id FK, role_type_id FK, valid_during tstzrange)`; role-specific data in subtype tables keyed by `party_role.id`.
- Use: when a party can hold several roles.
- Avoid: single-role systems.
- Sources: S.

**13.3 Party Relationship**
- Problem: typed relationships between parties (employment, account manager, parent company), often time-bound.
- Shape: `party_relationship(id, from_party_role_id FK, to_party_role_id FK, relationship_type_id FK, valid_during, status)`.
- Use: B2B org structures, agency/client, referrals.
- Sources: S; F-A (Accountability).

**13.4 Contact Mechanism**
- Problem: parties have many emails, phones, addresses, each with purposes (billing, shipping) and validity.
- Shape: `contact_mechanism(id, kind)` + subtypes `postal_address`, `telecom_number`, `electronic_address`; `party_contact_mechanism(party_id, contact_mechanism_id, purpose_type_id, valid_during, is_primary)`; partial unique index for one primary per purpose.
- Use: CRMs, commerce, logistics.
- Avoid: simple apps; a `users.email` column plus an `address` table is enough.
- Sources: S.

**13.5 Product / Product Type / Item (inventory instance)**
- Problem: distinguish catalog definition, variants, and physical/serialized instances.
- Shape: `product(id, product_type_id, ...)`, `product_feature`/variant table, `inventory_item(id, product_id FK, serial_no UNIQUE NULL, location_id, quantity)`; price in an effectivity table (5.2).
- Use: commerce, inventory, asset tracking.
- Sources: S; H (things of the enterprise).

**13.6 Order / Order Line (header-detail)**
- Problem: a transaction with many line items.
- Shape: `order(id, tenant_id, customer_party_id, status, currency, ordered_at, totals...)`; `order_line(order_id FK CASCADE, line_no, product_id, quantity, unit_price_minor, ...)`, `PRIMARY KEY(order_id, line_no)`; status history (5.7); price snapshot (9.4). Same shape for invoice/quote/PO.
- Use: any commercial document.
- Sources: S; H; F `dependentMapping.html`.

**13.7 Agreement / Contract with terms**
- Problem: contracts between parties with versioned terms and items.
- Shape: `agreement(id, type, from_party_id, to_party_id, valid_during)`, `agreement_item(agreement_id, ...)`, `agreement_term(agreement_id, term_type_id, value, valid_during)`.
- Use: subscriptions, SLAs, pricing agreements, MSAs.
- Sources: S; H (contracts).

---

## 14. Cross-cutting app patterns

**14.1 Soft delete (deleted_at)**
- Problem: allow undo or retention of "deleted" rows.
- Shape: `deleted_at timestamptz NULL`; partial indexes and partial uniques `WHERE deleted_at IS NULL`; a view or ORM scope for live rows.
- Use: user-facing trash/undo with a short restore window.
- Avoid/tradeoff (SOFT): every query needs the filter; FKs no longer protect against "deleted" parents with live children; pruning is hard; undelete is rarely used. Alternative: hard delete + `deleted_record(id, table_name, object_id, deleted_at, data jsonb)` archive table written in the same statement.
- Sources: SOFT.

**14.2 Tagging**
- Problem: user-assigned labels.
- Shape: `tag(id, tenant_id, name, UNIQUE(tenant_id, lower(name)))` + `entity_tag(entity_id, tag_id, PRIMARY KEY(entity_id, tag_id))`; for multiple entity types use per-type junctions (2.7b).
- Use: any labeling.
- Avoid: `text[]` when tags need rename, metadata, or counts (acceptable for simple free-form labels with GIN index).
- Antipattern: Jaywalking, Multicolumn Attributes, Polymorphic Associations.
- Sources: K.

**14.3 Comments / threaded discussion**
- Problem: comments on several entity types, sometimes threaded.
- Shape: `comment(id, tenant_id, author_id, body, parent_comment_id NULL self-FK, created_at, edited_at, deleted_at)` + target via exclusive arc or per-parent junction (2.7); threading via adjacency list (3.1).
- Sources: K (Polymorphic Associations, Naive Trees use comments as the example).

**14.4 Reactions / likes / ratings as event rows**
- Problem: one reaction per user per target, countable.
- Shape: `post_like(post_id FK, user_id FK, created_at, PRIMARY KEY(post_id, user_id))`; ratings add `score smallint CHECK (score BETWEEN 1 AND 5)`.
- Use: likes, votes, bookmarks, follows.
- Avoid: incrementing a counter alone (loses who reacted and allows double votes).
- Sources: general practice.

**14.5 Counter cache / cached aggregate**
- Problem: `COUNT(*)` or `SUM` on hot paths is too slow.
- Shape: `post.like_count int NOT NULL DEFAULT 0` maintained by trigger or in the same transaction; or a separate `post_stats(post_id PK, like_count, ...)` row to reduce lock contention on the main row; periodic reconciliation job.
- Use: only after measurement shows the aggregate is a bottleneck.
- Avoid: as the source of truth; the event rows (14.4) are. Hot counters cause row-lock contention.
- Sources: general practice ([NF]).

**14.6 File/attachment metadata**
- Problem: files live in object storage; DB needs a reliable reference.
- Shape: see 8.11 (`file` row with storage key, checksum, status; FK from owning entity; cleanup via outbox/job).
- Sources: K (Phantom Files) for the problem; solution is general practice.

**14.7 Membership and roles (RBAC) for SaaS**
- Problem: users belong to workspaces with roles.
- Shape: `workspace(id)`, `users(id)`, `workspace_member(workspace_id, user_id, role_id FK or role CHECK, UNIQUE(workspace_id, user_id))`, optional `role_permission(role_id, permission)`; invitations in `invitation(id, workspace_id, email, role, token_hash UNIQUE, expires_at, accepted_at)`.
- Sources: junction-with-payload (2.3) applied; no single canonical source.

---

## Not covered / out of scope (noted for completeness)

- Star/snowflake schemas, SCD types 1 to 6 as warehouse techniques, data vault.
- Event sourcing as the system of record (outbox and audit log are covered as OLTP adjuncts).
- Sharding, replication, read replicas, partition routing (native partitioning mentioned only as a Metadata Tribbles fix).
- Document, key-value, and graph stores.
