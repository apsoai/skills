---
type: llm
---

Judge the schema printed in the response as a Postgres data model. Ignore Apso syntax and naming style; table and column names may differ from the examples here.
- Project and Task each get a created-by and an updated-by foreign key to User.
- An activity-log table (e.g. ActivityLog) records the action as one value from a fixed set, the target's entity type and id, the acting user as a foreign key to User, the organization as a foreign key, and when it happened.
- Existing tables and columns are preserved.
