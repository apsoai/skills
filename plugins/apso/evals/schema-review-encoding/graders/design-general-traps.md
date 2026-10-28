---
type: llm
---

The review flags at least four of these with a reasonable fix (names may differ):
- `amount` is a float; money needs an exact decimal or integer cents.
- `submittedAt` is a date, which drops the time; it should be a timestamp with time zone.
- `description` is a length-limited varchar (255 by default) and long text will be truncated; it should be text.
- `skillIds` stores a list of ids in one column; it should be a many-to-many relationship or junction table.
- Note links to its parent through `entityType` + `entityId` with no foreign key; it should use real foreign keys.
Fail if fewer than four are flagged.
