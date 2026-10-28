---
type: llm
---

Judge the answers in `.apso/migration-plan.json` and the explanation in the response. "The migration" means the one `apso migrate` writes from those answers. Ignore formatting and naming style. That migration is run against real rows separately, so judge only these points:
- The response tells the user that contacts whose status is `archived` become `closed`.
- The migration remaps existing rows rather than deleting any contacts.
