# Data Modeling Principles

The database-engineering rigor behind a good Apso schema. This is portable design wisdom — normalization, entity modeling, indexing, and scale — applied on top of the `.apsorc` format. It is **composed by** the `schema-designer` and `schema-review` skills (and other `data` skills), not triggered on its own.

For the `.apsorc` field-type table, relationship syntax, and working examples, see `apso-schema-guide.md`. This reference is about *how to design well*; the guide is about *how to write it*.

## 1. Normalization (3NF)

Design to Third Normal Form unless you have a measured reason not to.

- Every non-key attribute depends on **the key, the whole key, and nothing but the key**.
- **No transitive dependencies:** if A → B and B → C, then C belongs in its own entity, not on A.
- **No repeating groups:** a list/array of related things becomes a **separate entity with a relationship**, not a comma-joined field or a numbered set of columns (`tag1`, `tag2`, …).

Denormalize only deliberately (e.g., a cached counter for display) and document why — see "Counters vs. aggregation" below.

## 2. Entities vs. events (the counter trap)

Each entity represents **one real-world concept**. The most common modeling mistake is collapsing an *interaction* into a *counter*.

- User interactions — likes, views, bookmarks, follows, ratings — are **events**: they have a **who**, a **what**, and a **when**.
- Model them as their **own entity** (e.g. `PostLike` relating a `User` and a `Post`, with `created_at`), not as a `like_count` integer on the target.
- An event entity answers questions a counter can't: *Who liked this? When? Has this user already liked it? How many in the last 7 days?*
- If you also need a fast display number, keep **both**: the event entity for truth/analytics, an optional cached counter for reads (accepting the write complexity).

Rule of thumb: if you're about to add a field that "tracks" or "counts" interactions, add an **entity** instead.

## 3. Referential integrity & relationships

- Every relationship is **explicitly defined** (see the guide for `OneToMany` / `ManyToOne` / `ManyToMany` / `OneToOne` syntax).
- **Many-to-many requires a junction entity.** Don't fake it with array fields.
- Junction entities can carry **relationship metadata** — e.g. a `PostTag` can record *when* the tag was applied or *who* applied it. If a join needs attributes, it's a real entity.
- Let Apso generate foreign keys from relationships. **Do not hand-add `*_id` fields** (`user_id`, `organization_id`) — define the relationship and the FK is generated.

## 4. Indexing strategy

Indexes are the difference between O(n) table scans and O(log n) lookups. Be deliberate.

Index a field when it is used in:
- a **relationship / foreign key** (Apso indexes these from the relationship),
- a **`WHERE` filter** (`status`, `slug`, `email`),
- an **`ORDER BY`** (`created_at`, `published_at`),
- a **uniqueness** guarantee (`slug`, `email` → also a unique constraint).

Use **entity-level composite indexes** for common multi-column query patterns, and put the **higher-selectivity column first**:

```json
"indexes": [
  { "fields": ["organizationId", "status"] },
  { "fields": ["organizationId", "slug"], "unique": true }
]
```

## 5. Scale & Big-O

Design for the query patterns you'll actually run.

- **Query complexity:** unindexed filter = full scan O(n); B-tree index = O(log n). Index anything in `WHERE`, `ORDER BY`, or a join.
- **Avoid N+1:** design relationships so related data can be fetched in one query (eager load / join), not one query per parent row. Be wary of recursive self-joins.
- **Cardinality / selectivity:** high-cardinality fields (email, slug, uuid) are excellent index candidates. Low-cardinality fields (boolean, a 3-value status) are worth indexing only if frequently filtered *and* selective.
- **Pagination:** offset pagination is O(offset + limit) and degrades on deep pages; **cursor pagination** is O(log n) but needs an indexed, unique, sequential field (index `created_at` to enable it).
- **Counters vs. aggregation:** a cached counter is O(1) to read but needs careful increment logic; `COUNT(*)` is O(n) without support. For high traffic, consider both (see §2).
- **Write vs. read tradeoff:** more indexes = faster reads, slower writes; denormalized counters = faster reads, more write logic. Most apps are read-heavy — design for your ratio.

## 6. Multi-tenancy

If the app has tenants (organizations, teams, accounts), business entities should be **tenant-scoped** so queries are automatically filtered and access is verified. In Apso this is `scopeBy` (usually `organizationId`). Exceptions: the tenant root entity itself, global lookup tables, and auth entities. See the `multi-tenancy` skill for the full pattern.

## 7. Conventions that pay off

- **`created_at: true` and `updated_at: true` on every entity** — an audit trail is nearly free and always wanted.
- **Status lifecycles as enums** (`draft` / `published` / `archived`) rather than loose booleans; give a sensible default. Never set `default: null` on an enum.
- **Slugs** (indexed, unique) for anything with a public URL.
- **Rich metadata** over sparse tables: `title`, `slug`, `summary`, timestamps beat a bare `name`.

## Design review checklist

Run this before finalizing a schema:

- [ ] User interactions modeled as **event entities**, not counters
- [ ] Many-to-many uses **junction entities**; no array/`*_id` fakery
- [ ] No transitive dependencies / repeating groups (3NF)
- [ ] `indexes` populated for FKs, filters, and sort fields; composites for common queries
- [ ] Unique constraints on natural keys (email, slug)
- [ ] `created_at` / `updated_at` on every entity
- [ ] Status fields are enums with valid defaults (no `default: null`)
- [ ] Tenant-scoped entities use `scopeBy` (except tenant root / lookups / auth)
- [ ] Field types and syntax match `apso-schema-guide.md` (e.g. `text` not `string`/`varchar`; no `*_id` fields)
