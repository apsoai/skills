---
type: regex
# A nested scopeBy path (task.organizationId) is not enforced in Python or Go,
# and TypeScript through CLI 0.46.0 does not filter lists with it.
pattern: '"scopeBy"\s*:\s*(?:\[[^\]]*)?"[A-Za-z]\w*\.'
match: not_contains
target: {source: file, path: .apsorc}
---
