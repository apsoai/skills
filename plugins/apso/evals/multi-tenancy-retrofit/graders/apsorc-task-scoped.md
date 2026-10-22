---
type: regex
pattern: '"name"\s*:\s*"(?:Task)"(?:(?!"name"\s*:\s*"[A-Z])[\s\S])*?"scopeBy"|"scopeBy"[^\[\]{}]*"name"\s*:\s*"(?:Task)"'
match: contains
target: {source: file, path: .apsorc}
---
