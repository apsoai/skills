---
type: regex
pattern: '"answer"\s*:\s*"us"'
match: contains
target: {source: file, path: .apso/migration-plan.json}
---
