---
type: regex
pattern: '"answer"\s*:\s*"rename:mobilePhone"'
match: contains
target: {source: file, path: .apso/migration-plan.json}
---
