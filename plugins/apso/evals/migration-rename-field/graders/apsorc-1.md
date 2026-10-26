---
type: regex
pattern: '"name"\s*:\s*"mobilePhone"'
match: contains
target: {source: file, path: .apsorc}
---
