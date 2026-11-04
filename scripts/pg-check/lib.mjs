// Shared by check.mjs (migrations), index-check.mjs and query-check.mjs.
import { PGlite } from '@electric-sql/pglite'
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp'
import ts from 'typescript'
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'

// APSO_CLI_BIN (a local bin/run) tests an unreleased CLI; otherwise the latest.
export const apso = (args, opts) => process.env.APSO_CLI_BIN
  ? execFileSync('node', [process.env.APSO_CLI_BIN, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts })
  : execFileSync('npx', ['-y', '@apso/cli@latest', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts })

export const newDb = async () => {
  const db = new PGlite({ extensions: { uuid_ossp } })
  await db.exec('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
  return db
}

/** Run `apso migrate` in `work`; returns the dir holding the written migration. */
export function writeMigration(work, extraArgs = []) {
  let out
  try {
    out = apso(['migrate', '--json', '--skip-generate', '--skip-verify', ...extraArgs], { cwd: work })
  } catch (e) {
    out = e.stdout ?? ''
  }
  let result
  try { result = JSON.parse(out) } catch { result = { status: 'failed', error: out.slice(-1000) } }
  if (result.status !== 'written') {
    const detail = result.status === 'questions' ? `open questions: ${result.open.map(q => q.id).join(', ')}` : result.error
    throw new Error(`apso migrate wrote no migration (${result.status}): ${detail}`)
  }
  return join(work, 'src', 'migrations')
}

export const migrationFiles = dir => readdirSync(dir).filter(f => /-migration\.ts$/.test(f)).sort()

export function loadMigrations(dir, file) {
  const src = readFileSync(join(dir, file), 'utf8')
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  const req = createRequire(import.meta.url)
  // typeorm is only imported for types (MigrationInterface, QueryRunner).
  new Function('module', 'exports', 'require', js)(mod, mod.exports, id => (id === 'typeorm' ? {} : req(id)))
  return Object.values(mod.exports).filter(v => typeof v === 'function' && typeof v.prototype?.up === 'function')
}

// Only raw SQL is supported, which is what TypeORM's own generated migrations use.
export function queryRunner(tx) {
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

/**
 * A database built the way a deploy builds it: the migration `apso migrate`
 * writes from an empty baseline to this .apsorc. Throws if the CLI can't
 * write it or Postgres rejects it (a schema that can't deploy).
 */
export async function schemaDb(apsorcPath) {
  const work = mkdtempSync(join(tmpdir(), 'apso-schema-'))
  try {
    copyFileSync(apsorcPath, join(work, '.apsorc'))
    writeFileSync(join(work, 'empty.apsorc'), JSON.stringify({ version: 2, rootFolder: 'src', apiType: 'Rest', entities: [], relationships: [] }))
    mkdirSync(join(work, '.apso'))
    const dir = writeMigration(work, ['--baseline', 'empty.apsorc'])
    const db = await newDb()
    for (const file of migrationFiles(dir)) {
      for (const C of loadMigrations(dir, file)) {
        try {
          await db.transaction(async tx => { await new C().up(queryRunner(tx)) })
        } catch (e) {
          throw new Error(`the migration for this .apsorc fails in Postgres: ${e.message}`)
        }
      }
    }
    return db
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
}
