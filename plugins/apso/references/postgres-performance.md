# Postgres Indexes and Queries for Apso

How to choose indexes from the queries an app runs, and how to write SQL for report and custom endpoints that returns the right rows. Load it when designing or reviewing indexes, when a list or report is slow, and before writing any SQL by hand. Modeling patterns live in `relational-patterns.md`; this file assumes the entities exist.

Facts below are from the PostgreSQL 18 docs (postgresql.org/docs/18: indexes-multicolumn, indexes-ordering, ddl-constraints, functions-subquery, functions-aggregate, queries-limit) and were reproduced on Postgres 17 and 18.

## What Apso emits

- Every `.apsorc` index is a btree. `"index": true` on a field or a `ManyToOne` gives a single-column index. `"indexes": [{ "fields": [...] }]` gives a multi-column index in that column order; `"unique": true` on it makes it a unique index. `"uniques"` and field `"unique": true` give unique constraints, which Postgres backs with a unique btree index.
- The primary key is already indexed. Never add an index on `id`.
- A `OneToOne`'s foreign key column is already unique, so it is indexed; don't list it in `indexes` or `uniques` (the linter rejects it as an unknown field). It is always nullable and deletes with its parent.
- Foreign key columns are named `<to_name or entity>Id` (`projectId`, `assigneeId`) and are NOT indexed unless you ask. `created_at` and `updated_at` are real columns you can list in `indexes`.
- `scopeBy` adds `"organizationId" = <caller's org>` to every generated list, get, update and delete. Count it as an equality filter on every query of a scoped entity.
- Apso cannot emit partial, expression, covering (`INCLUDE`), GIN, BRIN or trigram indexes, `CHECK` constraints, `ON DELETE SET NULL`, or `NULLS NOT DISTINCT`. When a design needs one, emit the closest btree, then tell the user what is missing and the SQL to add it by hand.

## Choosing indexes

Work from the queries, not the columns. List each query the app runs on a table: its equality filters, its one range filter, and its ORDER BY. Then:

1. **Equality columns first, then the range or ORDER BY column.** `WHERE "projectId" = $1 AND status = 'todo' ORDER BY "dueDate" LIMIT 50` needs `["projectId", "status", "dueDate"]`. Postgres walks the index to the matching `(projectId, status)` block and reads rows already sorted by `dueDate`, so LIMIT stops after 50 rows with no Sort step. With `["projectId"]` alone it reads every task in the project, filters them, then sorts them.
2. **Only one range column narrows the scan.** For `WHERE "organizationId" = $1 AND created_at >= $2 ORDER BY created_at DESC`, use `["organizationId", "created_at"]`. Range-first (`["created_at", "organizationId"]`) turns the tenant into a filter over every tenant's recent rows. A descending ORDER BY uses the same index backwards, so `indexes` entries take bare column names: write `"created_at"`, never `"created_at DESC"` (Apso rejects it as an unknown field).
3. **Lead with the foreign key the query filters on, not the tenant column.** A task board filters by `projectId` and, through `scopeBy`, by `organizationId`. `projectId` already pins one tenant's project, so `["projectId", "status", "dueDate"]` is enough; `organizationId` in front only widens the index and leaves `projectId` without an index of its own (rule 5). Lead with `organizationId` only when it is the query's only equality filter, as in an organization-wide feed.
4. **Leftmost prefix.** `["a", "b", "c"]` serves `a`, `a + b` and `a + b + c`. It does not serve `b` alone (Postgres 18 skip scan only helps when `a` has a handful of values; don't design for it).
5. **Index every foreign key, once.** A foreign key without an index makes every parent delete and every "children of this parent" read scan the child table (in a 1M-row test, deleting 50 parents went from 1,346 ms to 14.5 ms with the index). An index or unique covers a foreign key only when the FK is its first column: `["assigneeId", "dueDate"]` covers `assigneeId`, `["organizationId", "assigneeId", "dueDate"]` does not. When one covers it, drop `"index": true` from that `ManyToOne`. Before finishing, check each `ManyToOne`: its column leads exactly one index.
6. **Tie-break paginated orders.** An ORDER BY that pages (`LIMIT`/`OFFSET` or "load more") must end in a unique column, or ties repeat and skip rows between pages: `ORDER BY created_at DESC, id DESC` with an index ending `["created_at", "id"]` when the list is hot.
7. **Keep indexes to three columns or fewer** unless one query dominates the table.

Don't add:

- **An index that another index already starts with.** `["projectId"]` is redundant next to `["projectId", "status", "dueDate"]`. An index matching a unique (`["organizationId", "email"]` next to `"uniques": [{ "fields": ["organizationId", "email"] }]`) is a duplicate, and so is a ManyToOne `"index": true` on `organizationId` there. Two declarations of the same columns can also make the generated migration create the same index name twice, which fails on deploy.
- **A single-column index on a boolean or a few-valued status.** `isActive`, `isFlagged`, `status` alone match a large share of rows, so the index saves little and every insert pays for it. Put the column after a selective one (`["assigneeId", "status"]`) or, for a rare value, ask for a partial index by hand.
- **An index on a column that changes constantly** (`lastSeenAt`, counters) unless a query filters on it. Each indexed column update writes to every index on the table (it blocks Postgres's in-place HOT update).
- **Speculative indexes.** No query, no index.

Verify on a real database with `EXPLAIN (ANALYZE, BUFFERS)` and realistic row counts. On a tiny table Postgres scans the table whatever the indexes; that is correct. `SET enable_seqscan = off` proves an index can be used, not that it would be chosen. In a plan, `Index Cond` narrows the scan, `Filter` means rows were read and thrown away, and a `Sort` above a `Limit` means no index matches the ORDER BY.

## Constraints that behave unexpectedly

- **NULLs never collide in a unique.** `"uniques": [{ "fields": ["organizationId", "parentId", "name"] }]` with a nullable `parent` allows any number of root-level rows with the same name, because `NULL` is not equal to `NULL`. Make the relationship required, or tell the user to enforce it in the handler (Postgres 15+ `UNIQUE NULLS NOT DISTINCT` needs hand-written SQL).
- **Business keys are unique per tenant.** `["organizationId", "slug"]`, not `slug` alone. Putting the tenant first lets the same index serve `WHERE "organizationId" = $1`.
- **Case-insensitive uniqueness** needs `lower(email)`, which Apso can't index. Lowercase on write, and query the stored value.
- **Cascades fan out.** `cascadeDelete` on a chain deletes grandchildren too, and each level without an FK index scans its table.

## Types that bite later

- Apso's `serial` key is a 32-bit `integer` (max 2,147,483,647). Use `"primaryKeyType": "uuid"` for tables that can grow without bound: events, logs, line items, messages.
- Apso writes `created_at` and `updated_at` as `timestamp` without time zone, filled by `now()` in the database's time zone (UTC by default on Neon, which Apso hosting uses, and on most managed Postgres). In SQL, treat them as UTC; for a tenant's local day, convert explicitly: `(created_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/New_York'`. Your own instant fields should be `timestamptz`.
- `float` is inexact (`0.1 + 0.2 <> 0.3`). Money and counted quantities are `decimal` with `precision` and `scale`, or integer minor units.
- `varchar` caps length and errors when exceeded; use `text` unless an external system sets the limit.

## Writing SQL for report and custom endpoints

Generated CRUD writes its own SQL. Hand-written SQL lives in `src/extensions/` and runs with the injected repository's `query`: `this.projectRepo.query(sql, [orgId])`. It bypasses `scopeBy`, so the tenant filter is your job.

**Identifiers.** Tables are snake_case (`time_entry`); columns are camelCase and must be double-quoted (`"projectId"`, `"organizationId"`); `created_at` is lowercase. `user` is a reserved word: always `"user"`.

**Every query filters by the caller's tenant.** Pass `req.organizationId` as `$1` and filter the root table on it. Never interpolate values into SQL strings.

Wrong results, and the fix:

| Mistake | What goes wrong | Write instead |
|---|---|---|
| `LEFT JOIN task t ON ... WHERE t.status <> 'done'` | Parents with no matching child vanish; the filter on the optional table turns it into an inner join | Move the condition into `ON`: `LEFT JOIN task t ON t."projectId" = p.id AND t.status <> 'done'` |
| `count(*)` over a `LEFT JOIN` | A parent with no children counts 1 | `count(t.id)` |
| `sum(x)` over no rows | `NULL`, not 0 | `coalesce(sum(x), 0)` |
| `WHERE id NOT IN (SELECT "assigneeId" FROM task)` | One `NULL` in the subquery makes the result empty | `WHERE NOT EXISTS (SELECT 1 FROM task t WHERE t."assigneeId" = u.id)` |
| Joining two child tables, then aggregating (`project` joined to `time_entry` and `comment`) | Rows multiply: 2 entries times 3 comments counts each hour 3 times and each comment 2 times. `sum(DISTINCT)` drops equal values, so it is not a fix | Aggregate each child separately: a correlated subquery per child, or `LEFT JOIN (SELECT "projectId", sum(hours) ... GROUP BY 1)` |
| `JOIN` to filter "has at least one child" | The parent repeats once per child | `WHERE EXISTS (...)`; don't patch with `DISTINCT` |
| `INNER JOIN` across a nullable relationship | Rows without a parent disappear from totals | `LEFT JOIN`, and label the `NULL` group ("Unassigned") |
| `created_at BETWEEN '2026-10-01' AND '2026-10-31'` | Misses everything after midnight on Oct 31; `AND '2026-11-01'` counts midnight in two months | Half-open: `created_at >= '2026-10-01' AND created_at < '2026-11-01'` |
| `paid_count / total_count` | Integer division truncates to 0; zero total raises an error | `paid_count::numeric / nullif(total_count, 0)` |
| `max(created_at)` per group, then join back on it | Ties return two rows | `DISTINCT ON ("projectId") ... ORDER BY "projectId", created_at DESC, id DESC`, or `LEFT JOIN LATERAL (... ORDER BY created_at DESC, id DESC LIMIT 1) ON true` to keep parents with none |
| `ORDER BY created_at LIMIT 20 OFFSET 2000` | Ties shuffle between pages, and the skipped rows are still read | Order by a unique tail (`created_at DESC, id DESC`); for deep lists, keyset: `WHERE (created_at, id) < ($2, $3)` |
| `WHERE coalesce(email, '') = $1`, `WHERE date(created_at) = $1`, `WHERE lower(email) = $1` | A function on the column skips its index | Compare the bare column: `email = $1`, a half-open range, or a stored lowercase value |
| `LIKE '%term'` | No btree helps a leading wildcard | Prefix search only, or ask for a trigram index by hand |

**One query per result set.** Never loop over rows issuing a query each (N+1). Load children for a page of parents with `WHERE "projectId" = ANY($2)`, or aggregate in the same query.

**Counts in one pass.** Several counts over one table are one query: `SELECT count(*) FILTER (WHERE status = 'active') AS active, count(*) FILTER (WHERE status = 'archived') AS archived FROM project WHERE "organizationId" = $1`.

**Bulk writes keep the tenant filter.** `UPDATE ... WHERE id = ANY($2) AND "organizationId" = $1`, and report how many rows changed, not how many ids were sent.
