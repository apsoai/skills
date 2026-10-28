---
type: regex
pattern: '"archived"'
match: not_contains
target: {source: file, path: .apsorc}
---
