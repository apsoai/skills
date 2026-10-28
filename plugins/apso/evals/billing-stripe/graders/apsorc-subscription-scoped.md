---
type: regex
pattern: '"name"\s*:\s*"(?:Subscription)"(?:(?!"name"\s*:\s*"[A-Z])[\s\S])*?"scopeBy"|"scopeBy"[^\[\]{}]*"name"\s*:\s*"(?:Subscription)"'
match: contains
target: {source: file, path: .apsorc}
---
