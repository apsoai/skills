---
type: llm
---

Judge the schema printed in the response as a Postgres data model for the requested CRM. Ignore Apso syntax; table and column names may differ from the examples here.
- Tables exist for the organization, sales reps (User or SalesRep), companies, contacts, deals, pipeline stages (e.g. PipelineStage or Stage), activities and tags.
- Contacts and tags are many-to-many, through a join table or a many-to-many relationship.
- An activity is linked to both a contact and a deal.
- Activity type and deal status are each one value from a fixed set, not free text.
Fail if any of these is missing.
