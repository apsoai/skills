---
type: regex
pattern: '"name"\s*:\s*"(?:Organization|Tenant|Workspace)"(?:(?!"name"\s*:\s*"[A-Z])[\s\S])*?"scopeBy"|"scopeBy"[^\[\]{}]*"name"\s*:\s*"(?:Organization|Tenant|Workspace)"'
match: not_contains
target: {source: file, path: .apsorc}
---
