---
type: regex
pattern: '"type"\s*:\s*"ManyToMany"'
match: contains
target: {source: file, path: .apsorc}
---
