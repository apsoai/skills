---
name: schema-review
category: data
description: Review an existing schema for normalization, indexing, scalability, and correctness, and recommend concrete .apsorc fixes. Triggers on "review my schema", "is this normalized", "will this scale", "harden my data model", "audit my schema", "improve my database design".
---

# Schema Review

Audit an existing `.apsorc` schema against database-engineering best practices and return concrete, prioritized fixes. Where `schema-designer` *produces* a schema, this skill *hardens* one — it's the database-architect pass.

Applies `references/data-modeling-principles.md` (the design rigor) and `references/apso-schema-guide.md` (the correct format).

## When To Use

- "Will this schema scale?" / "Is this normalized?"
- Before a first deploy, or before a schema grows past a handful of entities
- After a fast/first-pass generation, to catch modeling and indexing gaps
- When queries feel slow or the model feels off

## What I Check

**Modeling (correctness)**
- **Counter trap:** interactions (likes, views, follows, ratings) modeled as event entities, not integer counters (`data-modeling-principles` §2)
- **Normalization (3NF):** no transitive dependencies, no repeating groups / array-of-related-things (§1)
- **Relationships:** many-to-many via junction entities; no hand-added `*_id` fields; junction entities used where a join needs attributes (§3)

**Performance (scale)**
- **Indexing:** foreign keys, `WHERE` filters, and `ORDER BY` fields indexed; composite indexes for common multi-column queries, high-selectivity column first (§4)
- **Big-O / N+1:** relationships shaped for single-query fetches; pagination supported by an indexed sequential field (§5)
- **Cardinality:** high-cardinality fields indexed; low-cardinality indexed only when selective (§5)

**Conventions & correctness**
- `created_at` / `updated_at` on every entity
- Status fields are enums with valid defaults (no `default: null`)
- Unique constraints on natural keys (email, slug)
- Tenant-scoped entities use `scopeBy` (except tenant root / lookups / auth)
- Field types and syntax valid per the schema guide (`text` not `string`/`varchar`; no `*_id` fields; `date` not `timestamp`; `primaryKeyType: uuid` not a `uuid` field)

## How I Work

1. Read the current `.apsorc` (or the described schema).
2. Evaluate it against the checklist in `data-modeling-principles.md`.
3. Produce **findings**, each with: severity (blocker / recommended / optional), the issue, why it matters, and the **exact `.apsorc` change** to apply.
4. Offer to apply the accepted fixes.

## Output Format

A prioritized findings list, then the corrected schema fragments. Example:

```
BLOCKER — Post.like_count is a counter, not an entity
  Why: can't answer "who liked this / when / already liked?"; not analyzable.
  Fix: remove like_count; add a PostLike entity (ManyToOne to User and Post, created_at: true).

RECOMMENDED — Order has no index on (organizationId, status)
  Why: the dashboard filters orders by org + status → full scan at scale.
  Fix: add "indexes": [{ "fields": ["organizationId", "status"] }].

OPTIONAL — Project.name has no unique constraint within an org
  Why: duplicate project names per org are likely unintended.
  Fix: add "indexes": [{ "fields": ["organizationId", "name"], "unique": true }].
```

## Related

- `schema-designer` — produce a schema from requirements (this skill hardens the result)
- `references/data-modeling-principles.md` — the design rigor this skill applies
- `multi-tenancy`, `audit-trail`, `soft-delete` — patterns a review commonly recommends
