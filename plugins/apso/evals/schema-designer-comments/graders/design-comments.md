---
type: llm
---

Judge the schema printed in the response as a Postgres data model for the requested app. Ignore Apso syntax; names may differ from the examples here.
- A comment can belong to a task or to a document, and each of those links is a real foreign key (separate nullable references, or separate comment tables). A comment target stored as a type name plus an id with no foreign key fails this point.
- Replies use a nullable parent reference from a comment to another comment.
- Each reaction is its own row (comment, user, emoji), unique on that combination. A counter column alone fails this point; a cached count in addition to the rows is fine.
- The response names at least one rule the schema cannot enforce by itself (for example "exactly one of task or document is set") and says where it should be enforced.
Fail if any of these is missing.
