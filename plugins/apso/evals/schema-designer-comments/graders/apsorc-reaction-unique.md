---
type: regex
pattern: '"fields"\s*:\s*\[(?=[^\]]*"commentId")(?=[^\]]*"(?:user|author|reactor)Id")[^\]]*\]'
match: contains
target: {source: file, path: .apsorc}
---
