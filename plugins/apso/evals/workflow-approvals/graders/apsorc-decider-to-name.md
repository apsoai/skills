---
type: regex
pattern: '\{(?=[^{}]*"from"\s*:\s*"(?:\w*Approval\w*)")(?=[^{}]*"to"\s*:\s*"User")(?=[^{}]*"to_name")[^{}]*\}'
match: contains
target: {source: file, path: .apsorc}
---
