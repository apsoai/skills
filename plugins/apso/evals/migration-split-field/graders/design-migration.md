---
type: llm
---

Judge the answers in `.apso/migration-plan.json` and the explanation in the response. "The migration" means the one `apso migrate` writes from those answers. Ignore formatting and naming style. That migration is run against real rows separately, so judge only these points:
- The migration fills firstName and lastName from the existing fullName values before dropping fullName, instead of adding empty columns.
- The response says how names with more than two words or a single word are split.
