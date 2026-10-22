---
type: regex
# Hand-written foreign keys. Business identifiers like taxId are allowed.
pattern: '"name"\s*:\s*"(?![^"]*(?:[Tt]ax|TAX|[Vv]at|[Ee]xternal|[Ss]tripe))\w+(_id|Id)"'
match: not_contains
target: {source: file, path: .apsorc}
---
