---
type: regex
pattern: '\{(?=[^{}]*"from"\s*:\s*"(?:ActivityLog|AuditLog)")(?=[^{}]*"to"\s*:\s*"User")(?=[^{}]*"to_name")[^{}]*\}'
match: contains
target: {source: file, path: .apsorc}
---
