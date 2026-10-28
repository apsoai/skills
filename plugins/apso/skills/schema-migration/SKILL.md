---
name: schema-migration
category: data
description: Change the schema of an Apso service that is already deployed or holds data, without losing or breaking that data, including moving data between columns and tables. Runs apso migrate, answers its questions (rename or drop, how a field splits, what replaces a removed enum value, what existing rows get), lets the CLI write the migration from those answers, and verifies it against seeded rows. Triggers on "rename a field", "rename an entity/table", "make this field required", "change the type of", "remove an enum value", "add a unique constraint", "drop this column", "move this field to its own entity", "make this many-to-many", "split this field", "merge these fields", "migrate my schema", "write a migration", "review this migration", "change my schema in production", or any schema edit to a service that has users or data.
---

# Schema Migration

Change a live schema safely. Editing `.apsorc` changes the generated code; only a migration file changes the database. `apso migrate` writes that file. Your job is to answer the questions it asks, because the schema alone can't say whether a missing field was renamed or dropped, how a field splits, or what existing rows should get.

Use `schema-designer` for a new schema with no data. Use this skill as soon as the service has been deployed or holds rows that matter.

## How Apso migrations work

1. **The deploy only runs migration files you commit.** A TypeScript service's deploy runs `npm run db:migrate`, which executes `src/migrations/*-migration.ts`. With no migration file the deploy succeeds, changes nothing in the database, and the new code runs against the old tables.
2. **`apso migrate` plans, then writes.** It compares the deployed `.apsorc` with the current one. Every change whose intent is ambiguous becomes a question in `.apso/migration-plan.json`. Once all are answered, it writes `src/migrations/<timestamp>-SchemaUpdate-migration.ts` (an Alembic revision for Python, a goose file for Go) plus `<same name>.plan.json` beside it, and tests it on a local PGlite copy of the deployed schema.
3. **The same answers always give the same SQL.** You never write or patch SQL by hand. If the migration is wrong, change an answer and run it again.
4. **The baseline is found for you.** The first time, pass the deployed schema with `--baseline deployed.apsorc` (`git show <deployed commit>:.apsorc > deployed.apsorc`, or `apso schema pull` into a scratch dir). After that, `apso migrate` starts from the schema the last planned migration produced.
5. **The schema changes before the new code deploys.** For a minute or two the old code runs against the new schema. See "Expand, then contract".

## Workflow

1. **Edit `.apsorc`** so it describes the database you want, column for column.
2. **Run `apso migrate`** (add `--baseline deployed.apsorc` the first time). In a terminal it asks each question. Without a terminal, or with `--json`, it prints the open questions as JSON and exits 2:
   ```json
   { "status": "questions", "plan": ".apso/migration-plan.json",
     "open": [{ "id": "field:Contact.phone", "kind": "removedField",
                "subject": "Field Contact.phone (varchar) is gone",
                "options": ["rename:mobilePhone", "drop"], "suggested": "rename:mobilePhone",
                "labels": { "rename:mobilePhone": "Renamed to mobilePhone (keeps the data)", "drop": "Dropped (deletes its data)" } }] }
   ```
3. **Answer every question** (see below). Pass simple answers as flags: `apso migrate --answer field:Contact.phone=rename:mobilePhone`. For `sql` and `split:` answers, also set the question's `"sql"` in `.apso/migration-plan.json`: a string, or one expression per split field. You can instead write `"answer"` (and `"sql"`) straight into the plan file and run `apso migrate` with no flags.
4. **Run `apso migrate` again** until it prints `"status": "written"`. Answers can raise new questions (dropping a field can leave a required one to backfill).
5. **Seed and verify:** write `seed.sql` with INSERTs into the deployed schema that look like production, including the awkward rows: nulls, duplicates, values outside the new enum, text that will not cast. Run `apso migrate verify --seed seed.sql`. It fails if any row or value is lost; values copied into a table the migration creates count as kept. For a split or a merge, add `checks.sql` (SELECTs returning a boolean `ok` and a `label`) with `--check checks.sql`. Use `--accept-loss <table.column>` only for a loss the user agreed to.
6. **Commit** the `.apsorc`, the migration and its `.plan.json`. Then report to the user (see the end).

If you cannot run the CLI (no shell, or you were handed the questions), answer them in `.apso/migration-plan.json` by reading it, and give the user the `apso migrate` command to run next.

## Answering the questions

| Kind | Asked when | Options | How to answer |
|---|---|---|---|
| `removedField` | A field is gone | `rename:<field>`, `split:<a>,<b>`, `move:<Entity>.<field>`, `drop` | `rename` when the user renamed it (keeps the data). `split` with one SQL expression per new field. `move` copies the values into the new entity. `drop` deletes the data: only when the user said so |
| `removedEntity` | An entity is gone | `rename:<Entity>`, `drop` | `rename` keeps the rows and every link to them |
| `enumValue` | An enum value is removed | the remaining values | The value existing rows move to. Get the mapping from the user |
| `backfill` | A new required field, or a field made required, on a table with rows | the enum values, a literal, or `sql` | What existing rows get. Never invent it; ask if the user didn't say |
| `cast` | A field changes type | `cast`, `sql` | `cast` converts as is and fails on values that don't convert. `sql` with a guarded expression turns bad values into NULL instead |
| `relation` | ManyToOne becomes ManyToMany, or similar | `copy-links`, `drop-links` | `copy-links` keeps every existing link |

`suggested` is set only when exactly one reading fits, and it still needs an answer. When the user's request makes the intent plain ("rename phone to mobilePhone", "archived contacts become closed"), answer without asking. When it doesn't, ask the user. Never answer `drop` or `drop-links` on your own: data is gone after the deploy.

## SQL answers

Write expressions over the old columns of the same row, quoted the way Postgres stores them (`"fullName"`, camelCase).

**Split** (`fullName` into `firstName` and `lastName`; the CLI's `splitDefaults` gives this starting point):
```json
"sql": {
  "firstName": "split_part(btrim(\"fullName\"), ' ', 1)",
  "lastName": "NULLIF(btrim(substr(btrim(\"fullName\"), length(split_part(btrim(\"fullName\"), ' ', 1)) + 1)), '')"
}
```
Tell the user how single names ("Cher") and longer ones ("Ludwig van Beethoven") split, and prove it in `checks.sql`:
```sql
SELECT bool_and(btrim(concat_ws(' ', "firstName", "lastName")) <> '') AS ok, 'every contact keeps a name' AS label FROM "contact";
```

**Type change** (`score` text to integer) with values that may not parse:
```json
"answer": "sql",
"sql": "CASE WHEN btrim(\"score\") ~ '^-?[0-9]+$' THEN btrim(\"score\")::integer END"
```
Values that don't parse become NULL and `verify --seed` reports them as lost. Tell the user how to count them first (`SELECT count(*) FROM "contact" WHERE btrim("score") !~ '^-?[0-9]+$'`) and get their agreement, or keep the old column as a copy.

**Backfill from other columns:** `"answer": "sql", "sql": "lower(\"email\")"`.

## Things a plan does not cover

- **A unique constraint on existing rows** fails if there are duplicates. Check first (`SELECT "email", count(*) FROM "contact" GROUP BY 1 HAVING count(*) > 1`), and resolve them with the user's rule before deploying.
- **A field moved into an existing table** (`Contact.companyDomain` to `Company.domain`): several contacts can disagree. Ask which value wins and prove the result with `--check`.
- **Merging fields** (`firstName` and `lastName` into `fullName`): answer the backfill for `fullName` with `btrim(concat_ws(' ', "firstName", "lastName"))`, and the drops for the two old fields only once the user agrees.

## Expand, then contract

Because the database changes before the new code goes live, a rename or drop breaks the running API for a minute or two. That is fine for an app with no users yet; tell the user and let them choose. For a live app, split it across two deploys:

1. **Expand.** Add the new column or table, backfill it, keep the old one. Deploy code that writes both and reads the new one.
2. **Contract.** After that deploy is live, remove the old field from `.apsorc` and run `apso migrate` again for a second migration.

## Database names

| `.apsorc` | Postgres |
|---|---|
| Entity `ContactNote` | table `"contact_note"` unless the entity sets `"table"` |
| Field `fullName` | column `"fullName"` (camelCase, quoted) |
| `ManyToOne` to `Company` | column `"companyId"` |
| `enum` field `status` on `contact` | type `"public"."contact_status_enum"` |
| `id` | `"id" SERIAL`, sequence `"<table>_id_seq"` |

## Report to the user

End with:
- the `.apsorc` change and the migration file path;
- each question and the answer you gave, and which ones you asked them about;
- what happens to existing rows, including values that become NULL or are lost;
- anything still needed from them (a backfill value, an enum mapping, a duplicate rule, approval to drop);
- the verify result, or the command to run it;
- the deploy order, and whether to use expand and contract.
