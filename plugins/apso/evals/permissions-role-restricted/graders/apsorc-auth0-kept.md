---
type: regex
pattern: '"provider"\s*:\s*"auth0"'
match: contains
target: {source: file, path: .apsorc}
---
