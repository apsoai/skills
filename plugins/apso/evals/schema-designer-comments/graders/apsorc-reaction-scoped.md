---
type: regex
# Reactions are tenant data too, two levels below the organization.
pattern: '"name"\s*:\s*"(?:\w*Reaction)"(?:(?!"name"\s*:\s*"[A-Z])[\s\S])*?"scopeBy"|"scopeBy"[^\[\]{}]*"name"\s*:\s*"(?:\w*Reaction)"'
match: contains
target: {source: file, path: .apsorc}
---
