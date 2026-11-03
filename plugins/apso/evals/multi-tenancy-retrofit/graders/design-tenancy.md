---
type: llm
---

Judge the schema printed in the response as a Postgres data model. Ignore Apso syntax and naming style; table and column names may differ from the examples here.
- An organization (or tenant or workspace) table exists.
- Project and Task each have their own organization column, a foreign key or a tenant id field. Task reaching its organization only through its Project fails this point.
- Country stays a global lookup table with no organization foreign key.
- The original Project and Task columns and the Project-to-Task relationship are preserved.
