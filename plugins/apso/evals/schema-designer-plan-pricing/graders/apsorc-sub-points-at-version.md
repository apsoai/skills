---
type: regex
pattern: '"from"\s*:\s*"\w*Subscription\w*"\s*,\s*"to"\s*:\s*"\w*(?:Version|Price|Terms|Revision|Rate)\w*"|"from"\s*:\s*"\w*(?:Version|Price|Terms|Revision|Rate)\w*"\s*,\s*"to"\s*:\s*"\w*Subscription\w*"\s*,\s*"type"\s*:\s*"OneToMany"'
match: contains
target: {source: file, path: .apsorc}
---
