---
type: llm
---

Judge the migration and the explanation in the response. Ignore formatting and naming style. The migration's SQL is run against real rows separately, so judge only these points:
- The response tells the user that contacts whose status is `archived` become `closed`.
- The migration remaps existing rows rather than deleting any contacts.
