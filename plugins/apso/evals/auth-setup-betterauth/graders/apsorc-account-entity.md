---
type: regex
pattern: '\"name\"\s*:\s*\"account\"'
match: contains
target: {source: file, path: .apsorc}
---
