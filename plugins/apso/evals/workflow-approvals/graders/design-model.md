---
type: llm
---

Judge the schema printed in the response as a Postgres data model. Ignore Apso syntax and naming style; table and column names may differ from the examples here.
- An expense report table has a status that is one value from a fixed set with a default, covering waiting for manager approval, waiting for finance approval, approved and rejected.
- Each approval decision is its own row in a history table: which step (manager or finance), the decision, who decided (a foreign key to User), when, and a foreign key to the expense report. Earlier decisions are kept, not overwritten.
- The new tables belong to the organization.
