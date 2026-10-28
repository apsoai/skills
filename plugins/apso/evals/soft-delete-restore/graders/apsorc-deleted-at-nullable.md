---
type: regex
pattern: '"name"\s*:\s*"deleted_?[aA]t"[^{}]*"nullable"\s*:\s*true|"nullable"\s*:\s*true[^{}]*"name"\s*:\s*"deleted_?[aA]t"'
match: contains
target: {source: file, path: .apsorc}
---
