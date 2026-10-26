---
type: regex
pattern: '"name"\s*:\s*"region"'
match: contains
target: {source: file, path: .apsorc}
---
