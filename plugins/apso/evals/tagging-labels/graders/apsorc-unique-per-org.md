---
type: regex
pattern: '\{(?=[^{}]*"fields"\s*:\s*\[[^\]]*"organizationId")(?=[^{}]*"unique"\s*:\s*true)[^{}]*\}'
match: contains
target: {source: file, path: .apsorc}
---
