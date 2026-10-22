---
type: regex
pattern: '"name"\s*:\s*"\w*(?:phone|email|address)\w*\d"|"name"\s*:\s*"(?:secondary|alternate|other)\w*(?:[Pp]hone|[Ee]mail|[Aa]ddress)"'
flags: i
match: not_contains
target: {source: file, path: .apsorc}
---
