---
type: llm
---

Judge the answers in `.apso/migration-plan.json` and the explanation in the response. "The migration" means the one `apso migrate` writes from those answers. Ignore formatting and naming style. That migration is run against real rows separately, so judge only these points:
- The migration renames the existing `phone` column instead of dropping it and adding a new column.
- The response tells the user that existing phone numbers are kept.
