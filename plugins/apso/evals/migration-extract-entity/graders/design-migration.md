---
type: llm
---

Judge the answers in `.apso/migration-plan.json` and the explanation in the response. "The migration" means the one `apso migrate` writes from those answers. Ignore formatting and naming style. That migration is run against real rows separately, so judge only these points:
- The migration copies each contact's existing phone into the new phone number table before dropping the phone column.
- The response says which label the copied numbers get, and that contacts without a phone get no row.
