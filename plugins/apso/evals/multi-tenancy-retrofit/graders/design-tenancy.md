---
type: llm
---

Judge the schema printed in the response as a Postgres data model. Ignore Apso syntax and naming style; table and column names may differ from the examples here.
- An organization (or tenant or workspace) table exists.
- Project and Task each belong to an organization: Project through a foreign key, and Task either directly or through its Project.
- Country stays a global lookup table with no organization foreign key.
- The original Project and Task columns and the Project-to-Task relationship are preserved.
