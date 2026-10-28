---
type: regex
pattern: '"answer"\s*:\s*"copy-links"'
match: contains
target: {source: file, path: .apso/migration-plan.json}
---
