---
type: regex
pattern: '"name"\s*:\s*"firstName"'
match: contains
target: {source: file, path: .apsorc}
---
