---
type: regex
pattern: '\"name\"\s*:\s*\"(Tag|Label)\"'
match: contains
target: {source: file, path: .apsorc}
---
