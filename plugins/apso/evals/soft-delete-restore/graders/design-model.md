---
type: llm
---

Judge the schema and explanation in the response as a Postgres design. Ignore Apso syntax.
- Project gets a nullable deleted-at timestamp (indexed), or an equivalent deleted status plus timestamp, and a clear 30-day purge rule (a purge-after time, or a scheduled job that hard-deletes rows deleted more than 30 days ago).
- The answer says default queries must exclude soft-deleted rows and that restore clears the marker.
Fail if deletion is modeled only by removing rows.
