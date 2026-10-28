---
type: regex
pattern: '"answer"\s*:\s*"split:firstName,lastName"'
match: contains
target: {source: file, path: .apso/migration-plan.json}
---
