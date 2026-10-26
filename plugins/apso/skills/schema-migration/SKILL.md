---
name: schema-migration
category: data
description: Change the schema of an Apso service that is already deployed or holds data, without losing or breaking that data. Writes the .apsorc change and the migration file that carries it to the database. Triggers on "rename a field", "rename an entity/table", "make this field required", "change the type of", "remove an enum value", "add a unique constraint", "drop this column", "migrate my schema", "write a migration", "change my schema in production", or any schema edit to a service that has users or data.
---

# Schema Migration

Change a live schema safely. Editing `.apsorc` changes the generated code; only a migration file changes the database. This skill writes both, so the deploy moves the data instead of dropping it.

Use `schema-designer` for a new schema with no data. Use this skill as soon as the service has been deployed or holds rows that matter.

## How Apso migrations actually work

Know these before writing anything:

1. **The deploy only runs migration files you commit.** A TypeScript service's deploy runs `npm run db:migrate`, which executes `src/migrations/*-migration.ts` (compiled to `dist/migrations/*-migration.js`). The CLI generates no migration file for TypeScript. If there is no file, the deploy succeeds, changes nothing in the database, and the new code runs against the old tables. A file named anything other than `*-migration.ts` is never loaded.
2. **`apso migrate` only previews DDL.** It diffs `.apsorc` against a local snapshot and runs the SQL on an empty PGlite database. It cannot see failures that need rows (a `NOT NULL` column on a populated table, a unique constraint over duplicates, a cast of bad text). It does not track enum values or lengths, so enum changes show "No database-level changes detected". `apso migrate --apply` only updates the snapshot.
3. **Auto-diffs destroy renames and type changes.** TypeORM (behind `apso migrate --sql` and `typeorm migration:generate`) matches columns and tables by name. A renamed field becomes `DROP COLUMN` plus `ADD COLUMN`; a renamed entity becomes `DROP TABLE` plus `CREATE TABLE`; a type change drops and re-adds the column. All of these delete data. Never ship an auto-generated migration for these changes without rewriting it.
4. **The schema changes before the new code deploys.** The deploy syncs the database, then replaces the Lambda. For a minute or two the old code runs against the new schema. A rename or drop breaks the running API in that window. See "Zero-downtime" below.
5. **Nothing verifies the result.** After a deploy the platform marks the schema in sync whether or not a migration ran. Check it yourself.

## Database names

Write SQL against the names Apso generates (TypeScript/TypeORM):

| `.apsorc` | Postgres |
|---|---|
| Entity `ContactNote` | table `"contact_note"` (snake_case) unless the entity sets `"table"` |
| Field `fullName` | column `"fullName"` (camelCase, always quoted) |
| `ManyToOne` to `Company` | column `"companyId"`, plus FK and index constraints with hashed names |
| `ManyToOne` with `to_name: "owner"` | column `"ownerId"` |
| `enum` field `status` on `contact` | type `"public"."contact_status_enum"` |
| `created_at` / `updated_at` | `"created_at"`, `"updated_at"` `TIMESTAMP NOT NULL DEFAULT now()` |
| `text`, `varchar` + `length` | `text`, `character varying(n)` |
| `integer`, `decimal`, `boolean`, `timestamptz`, `json` | `integer`, `numeric`, `boolean`, `timestamp with time zone`, `jsonb` |
| `id` | `"id" SERIAL` primary key |

To see the exact DDL for a schema, run `apso migrate --sql` in a copy of the project with no `.apso/sandbox` snapshot; it prints the full `CREATE` script.

## Workflow

1. **Find what changed.** Compare the deployed `.apsorc` (git history, or `apso schema pull`) with the requested one. List every change.
2. **Classify each change** with the table below. For anything destructive, confirm with the user before writing it, and say exactly which data is lost.
3. **Edit `.apsorc`.** The final `.apsorc` must describe the database the migration leaves behind, column for column, or the code and the database disagree.
4. **Write the migration** at `src/migrations/<timestamp>-<kebab-name>-migration.ts`, using the recipes below.
5. **Test it against data** (see "Verify").
6. **Tell the user** what the migration does to existing rows, what it cannot fix, and the deploy order.

| Change | Risk | Recipe |
|---|---|---|
| Add nullable field, add entity, add ManyToMany, add index | Safe | Plain DDL |
| Add required field | Fails on populated tables | Add, backfill, then `SET NOT NULL` |
| Rename field | Auto-diff drops data | `RENAME COLUMN` |
| Rename entity | Auto-diff drops the table | `RENAME TO`, plus FK columns and enum types |
| Change field type | Auto-diff drops data; bad casts fail | `ALTER COLUMN ... TYPE ... USING` with a guarded cast |
| Add, rename or remove enum value | Removal fails while rows use it | Remap rows, swap the type |
| Add unique | Fails over duplicates | Check duplicates first; never delete silently |
| Make a field or ManyToOne required | Fails on nulls | Backfill first, or stop and ask |
| Drop field, entity or relationship | Data loss | Confirm, then contract phase |

## Migration file

```ts
import { MigrationInterface, QueryRunner } from 'typeorm'

export class RenameContactPhone1730000000000 implements MigrationInterface {
  name = 'RenameContactPhone1730000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "contact" RENAME COLUMN "phone" TO "mobilePhone"`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "contact" RENAME COLUMN "mobilePhone" TO "phone"`)
  }
}
```

- The class name ends in a 13-digit millisecond timestamp, and `name` matches it. TypeORM orders migrations by that timestamp, so make it later than every existing migration.
- Use raw SQL through `queryRunner.query`, one statement per call. Do not use `queryRunner.addColumn` and friends; raw SQL is what you can review and test.
- Each migration runs in one transaction, so a failure rolls the whole file back.
- Write a real `down()`. When the `up()` loses information (a guarded cast that nulls bad values), say so in a comment.

## Recipes

**Rename a field.**
```sql
ALTER TABLE "contact" RENAME COLUMN "phone" TO "mobilePhone";
```

**Rename an entity** (`Company` to `Organization`). Rename the table, every foreign key column that points at it, and its enum types. The `SERIAL` sequence and the hashed constraint names can stay.
```sql
ALTER TABLE "company" RENAME TO "organization";
ALTER TABLE "contact" RENAME COLUMN "companyId" TO "organizationId";
ALTER TYPE "public"."company_tier_enum" RENAME TO "organization_tier_enum";
```
Update `.apsorc` to match: the entity name, every relationship's `from` or `to`, and any `scopeBy` that named the old foreign key.

**Add a required field.** Add it so existing rows get a value, backfill, then enforce. Get the backfill value from the user; never invent one.
```sql
CREATE TYPE "public"."company_region_enum" AS ENUM('us', 'eu', 'apac');
ALTER TABLE "company" ADD "region" "public"."company_region_enum";
UPDATE "company" SET "region" = 'us' WHERE "region" IS NULL;
ALTER TABLE "company" ALTER COLUMN "region" SET NOT NULL;
```
If the `.apsorc` field has a `default`, add `ALTER TABLE ... ALTER COLUMN ... SET DEFAULT ...` so the database matches.

**Change a type.** You cannot see production data, so guard the cast: convert what parses and decide explicitly what happens to the rest. Tell the user how many rows could be affected and how to count them first.
```sql
ALTER TABLE "contact" ALTER COLUMN "score" TYPE integer
  USING CASE WHEN btrim("score") ~ '^-?[0-9]+$' THEN btrim("score")::integer END;
```
Values that do not parse become `NULL` here, so the column must be nullable. If the user cannot lose them, copy the old column first, or stop and ask.

**Replace or remove an enum value.** Postgres cannot drop an enum value. Remap the rows, build the new type, swap it in, and keep the original type name, because the generated code expects `<table>_<field>_enum`.
```sql
ALTER TABLE "contact" ALTER COLUMN "status" DROP DEFAULT;
CREATE TYPE "public"."contact_status_enum_new" AS ENUM('lead', 'active', 'closed');
ALTER TABLE "contact" ALTER COLUMN "status" TYPE "public"."contact_status_enum_new"
  USING (CASE "status"::text WHEN 'archived' THEN 'closed' ELSE "status"::text END)::"public"."contact_status_enum_new";
DROP TYPE "public"."contact_status_enum";
ALTER TYPE "public"."contact_status_enum_new" RENAME TO "contact_status_enum";
ALTER TABLE "contact" ALTER COLUMN "status" SET DEFAULT 'lead';
```
Adding a value only needs `ALTER TYPE "public"."contact_status_enum" ADD VALUE 'closed'`, but it cannot run in the same transaction that uses the new value.

**Add a unique constraint.** Duplicates make it fail. Make the migration check and stop with a clear message, and give the user the query to find them. Never delete or merge rows without the user's rule for which row wins.
```sql
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "contact" GROUP BY lower("email") HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'contact.email has duplicates; resolve them before adding the unique index';
  END IF;
END $$;
CREATE UNIQUE INDEX "UQ_contact_email" ON "contact" ("email");
```

**Make a field or foreign key required.** Backfill the nulls first with a value the user chooses, or stop. The same pattern as "add a required field".

**Drop a field, entity or relationship.** Confirm with the user and name what is lost. Removing a `ManyToOne` drops its foreign key column; removing a `ManyToMany` drops its join table. Suggest a backup or copy first, and do it as the contract phase below.

## Zero-downtime: expand, then contract

Because the database changes before the new code goes live, a rename or drop breaks the running API for a minute or two. That is acceptable for an app with no users yet. Tell the user and let them choose. For a live app, split the change across two deploys:

1. **Expand.** Add the new column or table, backfill it, and keep the old one. Deploy code that writes both and reads the new one.
2. **Contract.** After that deploy is live, drop the old column in a second migration and deploy again.

## Verify

`apso migrate` proves the DDL parses on an empty database, nothing more. Before deploying:

- Run the migration against a copy with real-shaped rows: a local Postgres restored from `pg_dump`, or PGlite seeded with representative rows (including nulls, duplicates and malformed values).
- Check the rows afterwards: counts unchanged, renamed values present, backfilled columns filled.
- Check that the database now matches the final `.apsorc`: same tables, columns, types, nullability and enum values as `apso migrate --sql` generates for it.

## Python and Go services

The same recipes apply; only the file changes. Python services use Alembic (`alembic/versions/`, `op.execute(sql)`): the CLI writes `down_revision = None` into every generated file, so set it to the previous revision by hand or Alembic sees several heads. Go services use goose SQL files in `migrations/` with `-- +goose Up` and `-- +goose Down` sections.

## Report to the user

End with:
- the `.apsorc` changes and the migration file path;
- what happens to existing rows, change by change, including any values that become `NULL` or are lost;
- anything you stopped on and need from them (a backfill value, a duplicate rule, approval to drop);
- the deploy order, and whether to use expand and contract.
