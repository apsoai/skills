---
type: llm
---

Judge the schema printed in the response as a Postgres data model. Ignore Apso syntax and naming style; table and column names may differ from the examples here.
- A membership table (e.g. OrganizationMember) joins User and Organization, with the role as one value from a fixed set (owner, admin, member).
- A Role table belongs to an organization, and a Permission table holds a resource plus an action from a fixed set. Roles and permissions are many-to-many, through a join table or a many-to-many relationship.
- User does not get a single organization foreign key, since users belong to several organizations.
- Existing tables and columns are preserved.
