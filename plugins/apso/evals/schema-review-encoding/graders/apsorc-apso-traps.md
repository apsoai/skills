---
type: llm
---

The review must flag each of these Apso-specific problems with a correct fix:
1. Employee and Organization are related twice ("Employee ManyToOne Organization" and "Organization OneToMany Employee"). Apso generates the inverse side itself, so this duplicates the foreign key; one declaration must be removed.
2. The Employee manager self-reference is required (no `"nullable": true`), so the first employee (who has no manager) can never be inserted. It needs `"nullable": true`.
3. None of the ManyToOne relationships set `"index": true`, so the foreign keys are unindexed.
Fail if any of the three is missing or if the fix given is wrong.
