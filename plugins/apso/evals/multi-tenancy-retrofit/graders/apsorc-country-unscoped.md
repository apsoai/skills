---
type: regex
pattern: '"name"\s*:\s*"(?:Country)"(?:(?!"name"\s*:\s*"[A-Z])[\s\S])*?"scopeBy"|"scopeBy"[^\[\]{}]*"name"\s*:\s*"(?:Country)"'
match: not_contains
target: {source: file, path: .apsorc}
---
