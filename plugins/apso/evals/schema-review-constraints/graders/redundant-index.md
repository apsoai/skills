---
type: llm
---

Pass if the review flags at least one index as unnecessary: the "index": true on Document ManyToOne Organization (the (organizationId, slug) unique already starts with that column), or the single-column index on the boolean isPinned. Fail otherwise.
