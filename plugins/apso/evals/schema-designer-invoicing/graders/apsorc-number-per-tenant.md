---
type: regex
pattern: '"fields"\s*:\s*\[\s*"(?:organizationId"\s*,\s*"\w*[Nn]umber|\w*[Nn]umber"\s*,\s*"organizationId)"'
match: contains
target: {source: file, path: .apsorc}
---
