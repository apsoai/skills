// Runs the SQL an eval run wrote against seeded rows and compares the result.
//
//   node query-check.mjs <case query-check dir> <agent cwd>
//
// The case dir holds schema.apsorc (the database is built from it the way a
// deploy builds it), seed.sql (rows chosen so the usual mistakes return wrong
// answers: empty groups, NULLs, other tenants, end-of-day timestamps), and
// queries.json: { queries: [{ file, params, expect: [rows], ordered? }] }.
// `file` is relative to the agent's cwd. Values compare as strings, with
// numbers normalized, so 8, '8' and '8.00' match.
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { schemaDb } from './lib.mjs'

const [caseDir, cwd] = process.argv.slice(2)
const failures = []
const fail = msg => failures.push(msg)

const db = await schemaDb(join(caseDir, 'schema.apsorc'))
await db.exec(readFileSync(join(caseDir, 'seed.sql'), 'utf8'))

const norm = v => {
  if (v === null || v === undefined) return 'null'
  if (v instanceof Date) return v.toISOString()
  const s = String(v)
  return /^-?\d+(\.\d+)?$/.test(s) ? String(Number(s)) : s
}
const key = row => JSON.stringify(Object.keys(row).sort().map(k => [k, norm(row[k])]))
const show = rows => rows.map(r => JSON.stringify(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, norm(v)])))).join('\n      ')

const { queries } = JSON.parse(readFileSync(join(caseDir, 'queries.json'), 'utf8'))
for (const q of queries) {
  const path = join(cwd, q.file)
  if (!existsSync(path)) { fail(`${q.file}: not written`); continue }
  let rows
  try {
    rows = (await db.query(readFileSync(path, 'utf8'), q.params ?? [])).rows
  } catch (e) {
    fail(`${q.file}: errored: ${e.message}`)
    continue
  }
  const want = q.expect.map(key), got = rows.map(key)
  const same = q.ordered ? JSON.stringify(want) === JSON.stringify(got) : JSON.stringify([...want].sort()) === JSON.stringify([...got].sort())
  if (!same) fail(`${q.file}: wrong rows${q.ordered ? ' or order' : ''}.\n    expected:\n      ${show(q.expect)}\n    got:\n      ${show(rows)}`)
}

for (const f of failures) console.log('FAIL ' + f)
if (!failures.length) console.log(`OK ${queries.length} queries return the expected rows`)
process.exit(failures.length ? 1 : 0)
