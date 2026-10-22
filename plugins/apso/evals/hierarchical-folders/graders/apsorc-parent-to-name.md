---
type: regex
pattern: '\{(?=[^{}]*"from"\s*:\s*"Folder")(?=[^{}]*"to"\s*:\s*"Folder")(?=[^{}]*"ManyToOne")(?=[^{}]*"to_name")(?=[^{}]*"nullable"\s*:\s*true)[^{}]*\}'
match: contains
target: {source: file, path: .apsorc}
---
