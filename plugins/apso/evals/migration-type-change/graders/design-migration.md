---
type: llm
---

Judge the answers in `.apso/migration-plan.json` and the explanation in the response. "The migration" means the one `apso migrate` writes from those answers. Ignore formatting and naming style. That migration is run against real rows separately, so judge only these points:
- The migration converts the existing values in place instead of dropping the column and adding it back empty.
- The response says what happens to stored values that are not whole numbers.
