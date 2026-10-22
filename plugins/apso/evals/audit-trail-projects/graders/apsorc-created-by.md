---
type: regex
pattern: '\"to_name\"\s*:\s*\"createdBy\"'
match: contains
target: {source: file, path: .apsorc}
---
