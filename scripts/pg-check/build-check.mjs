// node build-check.mjs <expected.json> <.apsorc>
// Checks the schema has every entity the prompt asked for and that each scopeBy
// names a column the entity has (own field or ManyToOne FK), with no dot paths.
// Prints JSON: { ok, missing, badScope, entities, scoped }.
import { readFileSync } from 'node:fs'
const [expPath, rcPath] = process.argv.slice(2)
const exp = JSON.parse(readFileSync(expPath, 'utf8'))
const rc = JSON.parse(readFileSync(rcPath, 'utf8'))
const norm = s => { s = String(s).toLowerCase().replace(/[^a-z0-9]/g, ''); return s.endsWith('ies') ? s.slice(0, -3) + 'y' : s.endsWith('s') && !s.endsWith('ss') ? s.slice(0, -1) : s }
const ents = Array.isArray(rc.entities) ? rc.entities : []
const names = ents.map(e => norm(e.name))
const missing = exp.entities.filter(al => !al.map(norm).some(a => names.some(n => n === a || n.endsWith(a)))).map(al => al[0])
const rels = Array.isArray(rc.relationships) ? rc.relationships : []
const badScope = []
let scoped = 0
for (const e of ents) {
  if (!e.scopeBy) continue
  scoped++
  const cols = new Set((e.fields ?? []).map(f => f.name))
  for (const r of rels) if (r.from === e.name && (r.type === 'ManyToOne' || r.type === 'OneToOne')) {
    const base = r.to_name ?? r.to
    cols.add(base.charAt(0).toLowerCase() + base.slice(1) + 'Id')
  }
  for (const s of [].concat(e.scopeBy)) if (s.includes('.') || !cols.has(s)) badScope.push(`${e.name}.scopeBy ${s}`)
}
console.log(JSON.stringify({ ok: !missing.length && !badScope.length, missing, badScope, entities: ents.length, scoped }))
