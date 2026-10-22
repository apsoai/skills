---
type: regex
pattern: '"name"\s*:\s*"(?:Tag|Label)"(?:(?!"name"\s*:\s*"[A-Z])[\s\S])*?"scopeBy"|"scopeBy"[^\[\]{}]*"name"\s*:\s*"(?:Tag|Label)"'
match: contains
target: {source: file, path: .apsorc}
---
