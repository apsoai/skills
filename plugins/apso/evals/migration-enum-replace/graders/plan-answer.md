---
type: regex
pattern: '"answer"\s*:\s*"closed"'
match: contains
target: {source: file, path: .apso/migration-plan.json}
---
