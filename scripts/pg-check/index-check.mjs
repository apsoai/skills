// Checks that the indexes in an eval run's .apsorc serve the app's queries,
// using the database a deploy would build from it.
//
//   node index-check.mjs <case index-check dir> <agent cwd>
//
// The case dir holds queries.json: { queries: [{ label, sql, table, eq,
// also?, order? }] }. A query is served when some btree index on `table`
// starts with all its `eq` columns, in any order and optionally mixed with
// the query's other equality columns (`also`), followed by `order`, its
// ORDER BY column, so Postgres reads rows already sorted. That is the
// multi-column btree rule; the planner's own choice is not graded, because on
// empty tables it is arbitrary. Each query must still run against the schema.
//
// Every schema is also checked for indexes that cost writes and serve nothing:
// a non-unique index whose columns lead another index (a prefix or a
// duplicate, including of a UNIQUE or the primary key), and a single-column
// index on a boolean. And every foreign key must lead some index.
// An empty queries list runs only these schema-wide checks (design cases).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { schemaDb } from './lib.mjs'

const [caseDir, cwd] = process.argv.slice(2)
const failures = []
const fail = msg => failures.push(msg)

let db
try {
  db = await schemaDb(join(cwd, '.apsorc'))
} catch (e) {
  console.log(`FAIL ${e.message}`)
  process.exit(1)
}

const { queries } = JSON.parse(readFileSync(join(caseDir, 'queries.json'), 'utf8'))
const indexes = (await db.query(`
  SELECT t.relname AS tbl, i.relname AS name, x.indisunique AS uniq,
         array(SELECT a.attname::text FROM unnest(x.indkey) WITH ORDINALITY k(n, o)
               JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.n ORDER BY k.o) AS cols,
         array(SELECT format_type(a.atttypid, NULL) FROM unnest(x.indkey) WITH ORDINALITY k(n, o)
               JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.n ORDER BY k.o) AS types
  FROM pg_index x JOIN pg_class i ON i.oid = x.indexrelid JOIN pg_class t ON t.oid = x.indrelid
  JOIN pg_namespace s ON s.oid = t.relnamespace WHERE s.nspname = 'public'`)).rows

const leads = (a, b) => a.length <= b.length && a.every((c, i) => c === b[i])
for (const ix of indexes) {
  if (ix.uniq) continue
  const cover = indexes.find(o => o !== ix && o.tbl === ix.tbl && leads(ix.cols, o.cols) && (o.cols.length > ix.cols.length || o.uniq || o.name < ix.name))
  if (cover) fail(`redundant index on ${ix.tbl}(${ix.cols.join(', ')}): ${cover.uniq ? 'the unique constraint or key' : 'the index'} on (${cover.cols.join(', ')}) already serves it`)
  if (ix.cols.length === 1 && ix.types[0] === 'boolean') fail(`index on the boolean ${ix.tbl}.${ix.cols[0]}: two values, so Postgres reads half the table either way`)
}

for (const q of queries) {
  try {
    await db.query(`EXPLAIN ${q.sql}`)
  } catch (e) {
    fail(`${q.label}: query errored (table or column missing?): ${e.message}`)
    continue
  }
  const allowed = new Set([...q.eq, ...(q.also ?? [])])
  const serves = ix => {
    let n = 0
    while (n < ix.cols.length && allowed.has(ix.cols[n])) n++
    return q.eq.every(c => ix.cols.slice(0, n).includes(c)) && (!q.order || ix.cols[n] === q.order)
  }
  if (!indexes.some(ix => ix.tbl === q.table && serves(ix)))
    fail(`${q.label}: no index on ${q.table} starts with (${q.eq.join(', ')})${q.order ? ` then ${q.order}` : ''}, so Postgres ${q.order ? 'filters or sorts' : 'filters'} rows it could have skipped`)
}

const fks = (await db.query(`
  SELECT t.relname AS tbl, a.attname AS col FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = c.conkey[1]
  WHERE c.contype = 'f'`)).rows
for (const fk of fks)
  if (!indexes.some(ix => ix.tbl === fk.tbl && ix.cols[0] === fk.col)) fail(`foreign key ${fk.tbl}.${fk.col} leads no index, so deleting a parent or loading its children scans ${fk.tbl}`)

for (const f of failures) console.log('FAIL ' + f)
if (!failures.length) console.log(`OK ${queries.length} queries use indexes; no redundant indexes`)
process.exit(failures.length ? 1 : 0)
