---
type: regex
pattern: '"mcp"\s*:\s*\[\s*"read"\s*\]'
match: contains
target: {source: file, path: .apsorc}
---
