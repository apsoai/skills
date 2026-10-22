---
type: regex
pattern: '"name"\s*:\s*"(?:ActivityLog|AuditLog)"(?:(?!"name"\s*:\s*"[A-Z])[\s\S])*?"scopeBy"|"scopeBy"[^\[\]{}]*"name"\s*:\s*"(?:ActivityLog|AuditLog)"'
match: contains
target: {source: file, path: .apsorc}
---
