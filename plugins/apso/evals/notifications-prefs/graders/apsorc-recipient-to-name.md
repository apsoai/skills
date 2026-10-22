---
type: regex
pattern: '\{(?=[^{}]*"from"\s*:\s*"(?:Notification)")(?=[^{}]*"to"\s*:\s*"User")(?=[^{}]*"to_name")[^{}]*\}'
match: contains
target: {source: file, path: .apsorc}
---
