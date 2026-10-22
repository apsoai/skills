---
type: regex
# A comment target stored as type + id text columns has no foreign key.
pattern: '"name"\s*:\s*"\w*(?:[Tt]ype|_type)"(?=[\s\S]*"name"\s*:\s*"(?:entity|commentable|target|parent|subject|resource)_?[Ii]d")|"name"\s*:\s*"(?:entity|commentable|target|subject|resource)_?[Ii]d"'
match: not_contains
target: {source: file, path: .apsorc}
---
