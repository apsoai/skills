---
type: regex
pattern: '"fields"\s*:\s*\[\s*(?:"\w+"\s*,\s*)*"path"|"name"\s*:\s*"path"[^{}]*"index"\s*:\s*true'
match: contains
target: {source: file, path: .apsorc}
---
