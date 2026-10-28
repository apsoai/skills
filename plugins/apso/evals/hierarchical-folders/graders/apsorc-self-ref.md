---
type: regex
pattern: '\"from\"\s*:\s*\"Folder\"\s*,\s*\"to\"\s*:\s*\"Folder\"'
match: contains
target: {source: file, path: .apsorc}
---
