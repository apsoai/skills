---
type: llm
---

Judge the schema printed in the response as a Postgres data model. Ignore Apso syntax and naming style; table and column names may differ from the examples here.
- A tag (or label) table with name, color and slug belongs to the organization, and the slug or name is unique within an organization.
- Projects and tasks each relate to tags many-to-many, through join tables or many-to-many relationships.
Fail if tags are stored as a text or JSON array column on Project or Task.
