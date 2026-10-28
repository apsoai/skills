---
type: regex
pattern: '"name"\s*:\s*"phone"'
match: not_contains
target: {source: file, path: .apsorc}
---
