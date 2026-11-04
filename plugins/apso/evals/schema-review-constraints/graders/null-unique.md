---
type: llm
---

Pass if the review says the Folder unique on (organizationId, parentId, name) lets top-level folders share a name, because parentId is NULL for them and NULLs do not conflict in a unique. Fail otherwise.
