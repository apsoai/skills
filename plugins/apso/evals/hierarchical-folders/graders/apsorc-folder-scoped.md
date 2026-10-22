---
type: regex
pattern: '"name"\s*:\s*"(?:Folder)"(?:(?!"name"\s*:\s*"[A-Z])[\s\S])*?"scopeBy"|"scopeBy"[^\[\]{}]*"name"\s*:\s*"(?:Folder)"'
match: contains
target: {source: file, path: .apsorc}
---
