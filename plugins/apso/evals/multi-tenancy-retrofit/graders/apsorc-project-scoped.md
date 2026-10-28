---
type: regex
pattern: '"name"\s*:\s*"(?:Project)"(?:(?!"name"\s*:\s*"[A-Z])[\s\S])*?"scopeBy"|"scopeBy"[^\[\]{}]*"name"\s*:\s*"(?:Project)"'
match: contains
target: {source: file, path: .apsorc}
---
