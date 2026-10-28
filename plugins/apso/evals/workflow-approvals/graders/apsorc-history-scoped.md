---
type: regex
pattern: '"name"\s*:\s*"(?:\w*Approval\w*)"(?:(?!"name"\s*:\s*"[A-Z])[\s\S])*?"scopeBy"|"scopeBy"[^\[\]{}]*"name"\s*:\s*"(?:\w*Approval\w*)"'
match: contains
target: {source: file, path: .apsorc}
---
