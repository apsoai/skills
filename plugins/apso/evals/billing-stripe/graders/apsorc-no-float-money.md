---
type: regex
pattern: '\"type\"\s*:\s*\"(float|real|double)'
match: not_contains
target: {source: file, path: .apsorc}
---
