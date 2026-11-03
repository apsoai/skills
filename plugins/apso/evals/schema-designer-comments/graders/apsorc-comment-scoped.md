---
type: regex
# Comments are tenant data: each one is scoped directly, not through its task.
pattern: '"name"\s*:\s*"(?:\w*Comment)"(?:(?!"name"\s*:\s*"[A-Z])[\s\S])*?"scopeBy"|"scopeBy"[^\[\]{}]*"name"\s*:\s*"(?:\w*Comment)"'
match: contains
target: {source: file, path: .apsorc}
---
