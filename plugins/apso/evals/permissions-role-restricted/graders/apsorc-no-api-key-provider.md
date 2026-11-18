---
type: regex
pattern: '"provider"\s*:\s*"api-key"'
match: not_contains
target: {source: file, path: .apsorc}
---
