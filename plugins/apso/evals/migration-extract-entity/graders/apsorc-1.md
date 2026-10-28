---
type: regex
pattern: '"name"\s*:\s*"PhoneNumber"'
match: contains
target: {source: file, path: .apsorc}
---
