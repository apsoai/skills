// Runs the TypeORM migrations an eval run wrote against a seeded PGlite
// database, then checks the result. When the run answered a migration plan
// (.apso/migration-plan.json), the migration is the one `apso migrate` writes
// from those answers.
//
//   node check.mjs <case migration-check dir> <agent cwd>
//
// The case dir holds before.sql (production DDL + seed rows) and check.sql
// (SELECTs that each return one row with a boolean `ok` and a `label`).
// Also checks convergence: the migrated database must have the same columns,
// types, nullability and enum values as fresh DDL generated from the agent's
// final .apsorc, or the deployed code and the database disagree.
import { readFileSync, existsSync, mkdtempSync, mkdirSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { newDb, writeMigration, migrationFiles, loadMigrations, queryRunner, schemaDb } from './lib.mjs'

const [caseDir, cwd] = process.argv.slice(2)
const failures = []
const fail = msg => failures.push(msg)

// The template loads migrations/*-migration.js, so any other name never runs.
let migDir = join(cwd, 'src', 'migrations')
const planFile = join(cwd, '.apso', 'migration-plan.json')
if (existsSync(planFile)) {
  const work = mkdtempSync(join(tmpdir(), 'apso-plan-'))
  mkdirSync(join(work, '.apso'))
  copyFileSync(join(cwd, '.apsorc'), join(work, '.apsorc'))
  copyFileSync(planFile, join(work, '.apso', 'migration-plan.json'))
  try {
    migDir = writeMigration(work)
  } catch (e) {
    console.log(`FAIL ${e.message} (from the answered plan)`)
    process.exit(1)
  }
}
const files = existsSync(migDir) ? migrationFiles(migDir) : []
if (!files.length) {
  console.log('FAIL no migration file matching src/migrations/*-migration.ts (the deploy would change nothing)')
  process.exit(1)
}

const db = await newDb()
await db.exec(readFileSync(join(caseDir, 'before.sql'), 'utf8'))

for (const file of files) {
  const classes = loadMigrations(migDir, file)
  if (!classes.length) fail(`${file}: exports no migration class with up()`)
  for (const C of classes) {
    try {
      // TypeORM runs each migration in a transaction by default.
      await db.transaction(async tx => { await new C().up(queryRunner(tx)) })
    } catch (e) {
      // Some cases accept a migration that stops rather than lose data: a
      // RAISE EXCEPTION (P0001), or a strict cast that rejects a value
      // (22P02 invalid text, 22003 out of range). The transaction rolls it back.
      if (['P0001', '22P02', '22003'].includes(e.code) && existsSync(join(caseDir, 'allow-refusal'))) {
        console.log(`OK ${file} refused deliberately: ${e.message}`)
        process.exit(0)
      }
      fail(`${file} ${C.name}.up() failed on production-like data: ${e.message}`)
    }
  }
}

if (!failures.length) {
  try {
    for (const r of await db.exec(readFileSync(join(caseDir, 'check.sql'), 'utf8'))) {
      for (const row of r.rows) if (row.ok !== true) fail(`check failed: ${row.label ?? JSON.stringify(row)}`)
    }
  } catch (e) {
    fail(`check query errored (expected table or column missing?): ${e.message}`)
  }
}

async function shape(d) {
  const cols = (await d.query(`SELECT table_name, column_name, udt_name, is_nullable FROM information_schema.columns WHERE table_schema = 'public'`)).rows
    .map(c => `${c.table_name}.${c.column_name} ${c.udt_name}${c.is_nullable === 'YES' ? ' null' : ''}`)
  const enums = (await d.query(`SELECT t.typname, string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) AS labels FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid GROUP BY t.typname`)).rows
    .map(e => `enum ${e.typname}(${e.labels})`)
  return new Set([...cols, ...enums])
}

if (!failures.length && existsSync(join(cwd, '.apsorc'))) {
  try {
    const fresh = await schemaDb(join(cwd, '.apsorc'))
    const want = await shape(fresh), have = await shape(db)
    const missing = [...want].filter(x => !have.has(x)), extra = [...have].filter(x => !want.has(x))
    if (missing.length || extra.length) {
      fail(`database does not match the final .apsorc. Expected but missing: ${missing.join('; ') || 'none'}. Present but not expected: ${extra.join('; ') || 'none'}`)
    }
  } catch (e) {
    fail(e.message)
  }
}

for (const f of failures) console.log('FAIL ' + f)
if (!failures.length) console.log(`OK ${files.join(', ')}`)
process.exit(failures.length ? 1 : 0)
