---
type: regex
pattern: '"fields"\s*:\s*\[\s*(?:"\w+"\s*,\s*)*"expense\w*Id"'
match: contains
target: {source: file, path: .apsorc}
---
