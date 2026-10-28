---
type: regex
pattern: '"answer"\s*:\s*"sql"'
match: contains
target: {source: file, path: .apso/migration-plan.json}
---
