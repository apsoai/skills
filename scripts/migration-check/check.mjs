// Runs the TypeORM migrations an eval run wrote against a seeded PGlite
// database, then checks the result.
//
//   node check.mjs <case migration-check dir> <agent cwd>
//
// The case dir holds before.sql (production DDL + seed rows) and check.sql
// (SELECTs that each return one row with a boolean `ok` and a `label`).
// Also checks convergence: the migrated database must have the same columns,
// types, nullability and enum values as fresh DDL generated from the agent's
// final .apsorc, or the deployed code and the database disagree.
import { PGlite } from '@electric-sql/pglite'
import ts from 'typescript'
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, existsSync, mkdtempSync, copyFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'

const [caseDir, cwd] = process.argv.slice(2)
const failures = []
const fail = msg => failures.push(msg)

// The template loads migrations/*-migration.js, so any other name never runs.
const migDir = join(cwd, 'src', 'migrations')
const files = existsSync(migDir) ? readdirSync(migDir).filter(f => /-migration\.ts$/.test(f)).sort() : []
if (!files.length) {
  console.log('FAIL no migration file matching src/migrations/*-migration.ts (the deploy would change nothing)')
  process.exit(1)
}

function loadMigrations(file) {
  const src = readFileSync(join(migDir, file), 'utf8')
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  const req = createRequire(import.meta.url)
  // typeorm is only imported for types (MigrationInterface, QueryRunner).
  new Function('module', 'exports', 'require', js)(mod, mod.exports, id => (id === 'typeorm' ? {} : req(id)))
  return Object.values(mod.exports).filter(v => typeof v === 'function' && typeof v.prototype?.up === 'function')
}

// Only raw SQL is supported, which is what TypeORM's own generated migrations use.
function queryRunner(tx) {
  const qr = {
    async query(sql, params) {
      try {
        return (await tx.query(sql, params ?? [])).rows
      } catch (e) {
        if (params?.length || !/multiple commands/i.test(e.message)) throw e
        const out = await tx.exec(sql)
        return out.at(-1)?.rows ?? []
      }
    }
  }
  return new Proxy(qr, {
    get: (t, k) => (k in t ? t[k] : () => { throw new Error(`queryRunner.${String(k)} is not supported here; use queryRunner.query(sql)`) })
  })
}

const db = new PGlite()
await db.exec(readFileSync(join(caseDir, 'before.sql'), 'utf8'))

for (const file of files) {
  const classes = loadMigrations(file)
  if (!classes.length) fail(`${file}: exports no migration class with up()`)
  for (const C of classes) {
    try {
      // TypeORM runs each migration in a transaction by default.
      await db.transaction(async tx => { await new C().up(queryRunner(tx)) })
    } catch (e) {
      // Some cases accept a migration that deliberately stops (RAISE EXCEPTION,
      // SQLSTATE P0001) rather than lose data; the transaction rolls it back.
      if (e.code === 'P0001' && existsSync(join(caseDir, 'allow-refusal'))) {
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
  const tmp = mkdtempSync(join(tmpdir(), 'apso-ddl-'))
  try {
    copyFileSync(join(cwd, '.apsorc'), join(tmp, '.apsorc'))
    const out = execFileSync('npx', ['-y', '@apso/cli@latest', 'migrate', '--sql'], { cwd: tmp, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    const ddl = out.split('\n').filter(l => /^(CREATE|ALTER)\b/.test(l)).join('\n')
    const fresh = new PGlite()
    await fresh.exec(ddl)
    const want = await shape(fresh), have = await shape(db)
    const missing = [...want].filter(x => !have.has(x)), extra = [...have].filter(x => !want.has(x))
    if (missing.length || extra.length) {
      fail(`database does not match the final .apsorc. Expected but missing: ${missing.join('; ') || 'none'}. Present but not expected: ${extra.join('; ') || 'none'}`)
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}

for (const f of failures) console.log('FAIL ' + f)
if (!failures.length) console.log(`OK ${files.join(', ')}`)
process.exit(failures.length ? 1 : 0)
