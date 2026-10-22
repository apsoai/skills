---
type: llm
---

Judge the schema printed in the response as a Postgres data model. Ignore Apso syntax and naming style; table and column names may differ from the examples here.
- An attachment table stores the S3 object key and metadata (file name, MIME type, size in bytes), never the file contents.
- Each attachment belongs to a task (a foreign key, or an entity type plus entity id pair) and to the user who uploaded it.
- Attachments belong to the organization.
