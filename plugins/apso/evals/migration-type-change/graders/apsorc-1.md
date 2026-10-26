---
type: regex
pattern: '"name"\s*:\s*"score"\s*,\s*"type"\s*:\s*"integer"|"type"\s*:\s*"integer"\s*,\s*"name"\s*:\s*"score"'
match: contains
target: {source: file, path: .apsorc}
---
