---
type: regex
pattern: '"name"\s*:\s*"RolePermission"'
match: contains
target: {source: file, path: .apsorc}
---
