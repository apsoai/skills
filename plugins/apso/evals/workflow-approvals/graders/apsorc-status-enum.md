---
type: regex
pattern: '"(approved|rejected)"'
match: contains
target: {source: file, path: .apsorc}
---
