---
type: regex
pattern: '"type"\s*:\s*"float"'
match: not_contains
target: {source: file, path: .apsorc}
---
