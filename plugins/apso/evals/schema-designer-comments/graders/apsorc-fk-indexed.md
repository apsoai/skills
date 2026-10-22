---
type: regex
# Every ManyToOne needs "index": true; Apso does not index foreign keys itself.
pattern: '\{(?![^{}]*"index"\s*:\s*true)[^{}]*"type"\s*:\s*"ManyToOne"[^{}]*\}'
match: not_contains
target: {source: file, path: .apsorc}
---
