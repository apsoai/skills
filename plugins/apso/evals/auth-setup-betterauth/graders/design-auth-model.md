---
type: llm
---

Judge the schema printed in the response as a Postgres data model for email and password sign-in. Ignore Apso syntax; table and column names may differ from the examples here.
- The password hash lives on an account table that belongs to User, not on the user table.
- A session table belongs to User and has a unique token and an expiry time. A verification table holds email or reset tokens.
- The account table records the provider (e.g. credential) and the provider's account id.
- The existing Organization, Project and Task tables are preserved.
