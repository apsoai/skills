---
type: regex
pattern: '"name"\s*:\s*"(?:Notification)"(?:(?!"name"\s*:\s*"[A-Z])[\s\S])*?"scopeBy"|"scopeBy"[^\[\]{}]*"name"\s*:\s*"(?:Notification)"'
match: contains
target: {source: file, path: .apsorc}
---
