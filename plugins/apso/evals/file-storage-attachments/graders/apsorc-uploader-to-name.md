---
type: regex
pattern: '\{(?=[^{}]*"from"\s*:\s*"(?:(?:[A-Z]\w*)?(?:Attachment|File)s?)")(?=[^{}]*"to"\s*:\s*"User")(?=[^{}]*"to_name")[^{}]*\}'
match: contains
target: {source: file, path: .apsorc}
---
