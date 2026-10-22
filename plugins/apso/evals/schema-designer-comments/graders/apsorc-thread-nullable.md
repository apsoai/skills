---
type: regex
pattern: '"from"\s*:\s*"Comment"\s*,\s*"to"\s*:\s*"Comment"[^{}]*"nullable"\s*:\s*true'
match: contains
target: {source: file, path: .apsorc}
---
