---
type: regex
pattern: '"name"\s*:\s*"(?:(?:[A-Z]\w*)?(?:Attachment|File)s?)"(?:(?!"name"\s*:\s*"[A-Z])[\s\S])*?"scopeBy"|"scopeBy"[^\[\]{}]*"name"\s*:\s*"(?:(?:[A-Z]\w*)?(?:Attachment|File)s?)"'
match: contains
target: {source: file, path: .apsorc}
---
