---
type: regex
pattern: '"permissions"\s*:\s*\{'
match: contains
target: {source: file, path: .apsorc}
---
