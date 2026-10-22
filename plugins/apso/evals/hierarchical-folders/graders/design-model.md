---
type: llm
---

Judge the schema printed in the response as a Postgres data model. Ignore Apso syntax and naming style; table and column names may differ from the examples here.
- Folder has a nullable self-referencing parent foreign key, so root folders have no parent.
- Because "everything under this folder" queries are common, Folder also stores a materialized path (and ideally depth), and the path is indexed.
- Project has a foreign key to Folder. Folders belong to the organization.
