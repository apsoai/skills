---
type: llm
---

Judge the schema printed in the response as a Postgres data model. Ignore Apso syntax and naming style; table and column names may differ from the examples here.
- A notification table has a recipient foreign key to User, a title or body, a type, and read state (a read flag and/or a read-at time). Notifications belong to the organization.
- A per-user preference table lets each user turn email on or off per notification type, with at most one preference per user and type. An in-app flag is optional.
- The original Organization, User, Project and Task tables are still present.
