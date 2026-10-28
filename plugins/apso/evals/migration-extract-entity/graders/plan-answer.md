---
type: regex
pattern: '"answer"\s*:\s*"move:PhoneNumber\.number"'
match: contains
target: {source: file, path: .apso/migration-plan.json}
---
