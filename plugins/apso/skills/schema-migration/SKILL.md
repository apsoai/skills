---
name: schema-migration
category: data
description: Change the schema of an Apso service that is already deployed or holds data, without losing or breaking that data. Generates the migration with TypeORM, reviews it for statements that lose data or fail on real rows, patches only those, and verifies it against seeded rows. Triggers on "rename a field", "rename an entity/table", "make this field required", "change the type of", "remove an enum value", "add a unique constraint", "drop this column", "migrate my schema", "write a migration", "review this migration", "change my schema in production", or any schema edit to a service that has users or data.
---

# Schema Migration

Change a live schema safely. Editing `.apsorc` changes the generated code; only a migration file changes the database. TypeORM generates that file from the entities. This skill reviews what it generated, rewrites the statements that would lose data or fail on real rows, and proves the result against seeded data.

Use `schema-designer` for a new schema with no data. Use this skill as soon as the service has been deployed or holds rows that matter.

## How Apso migrations work

1. **The deploy only runs migration files you commit.** A TypeScript service's deploy runs `npm run db:migrate`, which executes `src/migrations/*-migration.ts`. A file named anything else is never loaded. With no migration file the deploy succeeds, changes nothing in the database, and the new code runs against the old tables.
2. **TypeORM generates the migration.** `apso migrate generate --baseline <deployed .apsorc>` builds the deployed schema in a local PGlite database, diffs the project's entities against it with TypeORM's `migration:generate`, and writes `src/migrations/<timestamp>-SchemaUpdate-migration.ts`. The editor's in-browser migration step does the same. Keep TypeORM's file; patch it.
3. **TypeORM diffs schemas, not data.** It does not know the table has rows. The statements it gets wrong are listed under "Review" below. Newer CLIs print them as `WARN <CODE>` lines.
4. **`apso migrate verify` proves it.** It runs the migration on a fresh copy of the deployed schema and then checks for drift: TypeORM must find nothing left to change. With `--seed seed.sql` it inserts rows first and fails if the migration loses any row or value.
5. **The schema changes before the new code deploys.** For a minute or two the old code runs against the new schema. See "Expand, then contract".

Bare `apso migrate` (no subcommand) is the older snapshot preview. It runs on an empty database and ignores enum values; do not use it to judge a TypeScript migration.

## Workflow

1. **Get the deployed schema** as a file, e.g. `git show <deployed commit>:.apsorc > deployed.apsorc` or `apso schema pull` into a scratch dir.
2. **Edit `.apsorc`**, then `apso generate`. The final `.apsorc` must describe the database you want, column for column.
3. **Generate:** `apso migrate generate --baseline deployed.apsorc`.
4. **Review** every statement in `up()` against the table below. For each hit, patch that statement and leave the rest of TypeORM's output alone. Ask the user wherever intent is ambiguous (is this a rename or a drop? what value do existing rows get? which duplicate wins?). Never invent a backfill value.
5. **Patch `down()`** to reverse your patch.
6. **Seed and verify:** write `seed.sql` with INSERTs into the deployed schema that look like production, including the awkward rows: nulls, duplicates, values outside the new enum, text that will not cast. Then `apso migrate verify --baseline deployed.apsorc --migration src/migrations/<file> --seed seed.sql`. Fix until it passes. If a loss is deliberate and the user agreed, rerun with `--accept-loss`.
7. **Report to the user** (see the end).

If you cannot run the CLI (no shell, or you were handed a generated file), do steps 4, 5 and 7 by reading the file, and give the user the verify command to run.

## Review: what TypeORM gets wrong

| TypeORM writes | On real rows | CLI code | Patch |
|---|---|---|---|
| `DROP COLUMN "x"` and `ADD "x" <new type>` | Every value is deleted | `TYPE_CHANGE_DROPS_DATA` | One `ALTER COLUMN "x" TYPE ... USING <guarded cast>` |
| `DROP COLUMN "a"` and `ADD "b"` on one table | `a`'s data is deleted | `POSSIBLE_RENAME` | If it is a rename: `RENAME COLUMN "a" TO "b"`, then any type or null change |
| `CREATE TABLE "new"` plus a foreign key from an existing table to it | FK fails on existing rows; the old table is left behind with its data | `FOREIGN_KEY_TO_NEW_TABLE` | Entity rename: replace the `CREATE TABLE` with `RENAME TO` and rename its id sequence |
| `ALTER TYPE ... RENAME TO "..._old"`, new enum, `USING "x"::"text"::<new enum>` | Fails on rows holding a removed value | `ENUM_VALUES_REMOVED` | Map removed values in the `USING` clause |
| `ADD "x" ... NOT NULL DEFAULT v` | Every existing row silently gets `v` | `DEFAULT_BACKFILLS_ROWS` | Keep it only if the user confirms `v` is right for existing rows; otherwise add nullable, backfill, `SET NOT NULL` |
| `ADD "x" ... NOT NULL` with no default | Fails if the table has rows | `NOT_NULL_WITHOUT_BACKFILL` | Add nullable, backfill with the user's value, `SET NOT NULL` |
| `ALTER COLUMN "x" SET NOT NULL` | Fails on null rows | `SET_NOT_NULL` | Backfill first |
| `CREATE UNIQUE INDEX` / `ADD CONSTRAINT ... UNIQUE` | Fails on duplicates | `UNIQUE_ON_EXISTING_ROWS` | Check first and stop with a clear message; never delete rows without the user's rule |
| `ALTER COLUMN "x" TYPE ...` | Fails on values the cast cannot convert | `TYPE_CAST` | Guard the cast |
| `DROP COLUMN` / `DROP TABLE` alone | Data is gone | `DROPS_COLUMN` / `DROPS_TABLE` | Confirm with the user, name what is lost, suggest a copy first |

TypeORM already turns a single matching drop and add into `RENAME COLUMN`. Leave those alone.

## Patches

**Type change.** Replace the drop and add:
```ts
await queryRunner.query(`ALTER TABLE "contact" ALTER COLUMN "score" TYPE integer USING CASE WHEN btrim("score") ~ '^-?[0-9]+$' THEN btrim("score")::integer END`);
```
Values that do not parse become `NULL`, so the column must be nullable, and `verify --seed` reports them as lost. Tell the user how to count them first (`SELECT count(*) FROM "contact" WHERE btrim("score") !~ '^-?[0-9]+$'`), and either get their agreement, keep the old column as a copy, or stop the migration with `RAISE EXCEPTION`.

**Entity rename** (`Company` to `Organization`). TypeORM renames the foreign key column correctly but creates `organization` empty. Replace its `CREATE TABLE "organization" (...)` with:
```ts
await queryRunner.query(`ALTER TABLE "company" RENAME TO "organization"`);
await queryRunner.query(`ALTER SEQUENCE "company_id_seq" RENAME TO "organization_id_seq"`);
```
Also rename the entity's enum types (`company_<field>_enum` to `organization_<field>_enum`). Keep TypeORM's index and constraint statements; the drift check confirms the rest. Update `.apsorc`: the entity name, every relationship's `from` or `to`, and any `scopeBy` that named the old foreign key.

**Enum value removed or renamed.** Keep TypeORM's type swap; change only its cast:
```ts
await queryRunner.query(`ALTER TABLE "contact" ALTER COLUMN "status" TYPE "public"."contact_status_enum" USING (CASE "status"::text WHEN 'archived' THEN 'closed' ELSE "status"::text END)::"public"."contact_status_enum"`);
```
Get the mapping from the user. Mirror it in `down()` if the old value should come back.

**Required field with no default.** Replace the single `ADD ... NOT NULL` with:
```ts
await queryRunner.query(`ALTER TABLE "company" ADD "region" "public"."company_region_enum"`);
await queryRunner.query(`UPDATE "company" SET "region" = 'us' WHERE "region" IS NULL`);
await queryRunner.query(`ALTER TABLE "company" ALTER COLUMN "region" SET NOT NULL`);
```
For an enum field the CLI sets a database default (the first value unless `.apsorc` gives one), so TypeORM writes `NOT NULL DEFAULT 'us'`. That backfills every row with `us`. Keep it when the user confirms `us` is right for existing rows.

**Unique constraint.** Put a check before TypeORM's statement:
```ts
await queryRunner.query(`DO $$ BEGIN IF EXISTS (SELECT 1 FROM "contact" GROUP BY "email" HAVING count(*) > 1) THEN RAISE EXCEPTION 'contact.email has duplicates; resolve them before adding the unique index'; END IF; END $$`);
```

Rules for every patch: raw SQL through `queryRunner.query`, one statement per call; keep the class name and `name` TypeORM wrote; the whole file runs in one transaction, so a failure rolls it all back.

## Expand, then contract

Because the database changes before the new code goes live, a rename or drop breaks the running API for a minute or two. That is fine for an app with no users yet; tell the user and let them choose. For a live app, split it across two deploys:

1. **Expand.** Add the new column or table, backfill it, keep the old one. Deploy code that writes both and reads the new one.
2. **Contract.** After that deploy is live, drop the old column in a second migration and deploy again.

## Database names

| `.apsorc` | Postgres |
|---|---|
| Entity `ContactNote` | table `"contact_note"` unless the entity sets `"table"` |
| Field `fullName` | column `"fullName"` (camelCase, quoted) |
| `ManyToOne` to `Company` | column `"companyId"` |
| `enum` field `status` on `contact` | type `"public"."contact_status_enum"` |
| `id` | `"id" SERIAL`, sequence `"<table>_id_seq"` |

## Python and Go services

`apso migrate generate` and `verify` are TypeScript only. Python services use Alembic: `alembic revision --autogenerate`, then apply the same review to the generated `op.*` calls (Alembic also turns renames into drop and add), and `alembic check` for drift. Go services use goose SQL files in `migrations/`; write them with the patches above and test them against a seeded copy.

## Report to the user

End with:
- the `.apsorc` change and the migration file path;
- each statement you changed in TypeORM's output and why;
- what happens to existing rows, including values that become `NULL` or are lost;
- anything you need from them (a backfill value, an enum mapping, a duplicate rule, approval to drop);
- the verify result, or the command to run it;
- the deploy order, and whether to use expand and contract.
