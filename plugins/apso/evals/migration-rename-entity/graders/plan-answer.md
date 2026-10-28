---
type: regex
pattern: '"answer"\s*:\s*"rename:Organization"'
match: contains
target: {source: file, path: .apso/migration-plan.json}
---
