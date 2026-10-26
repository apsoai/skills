---
type: llm
---

Judge the migration and the explanation in the response. Ignore formatting and naming style. The migration's SQL is run against real rows separately, so judge only these points:
- The migration renames the existing company table and the contact foreign key column instead of dropping and recreating them.
- The response tells the user that existing companies and their contact links are kept.
