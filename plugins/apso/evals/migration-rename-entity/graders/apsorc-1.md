---
type: regex
pattern: '"name"\s*:\s*"Organization"'
match: contains
target: {source: file, path: .apsorc}
---
