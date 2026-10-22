---
type: llm
---

Judge the schema printed in the response as a Postgres data model for the requested billing app. Ignore Apso syntax; names may differ from the examples here.
- Plan terms (price and limits) are stored as versions or dated rows separate from the plan itself, with a version number or a validity period, so past terms are never overwritten.
- A subscription points at the specific terms it was signed under (a plan version or price row), not only at the plan.
- Money is stored as an exact decimal or integer minor units, not floating point.
- The response names at least one rule the schema cannot enforce by itself (for example non-overlapping validity periods, or one current version per plan) and says where it should be enforced.
Fail if any of these is missing.
