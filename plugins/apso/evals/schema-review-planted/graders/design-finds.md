---
type: llm
---

The review flags at least three of these data-modeling problems with a sound fix:
- `likeCount` is a denormalized counter; likes belong in their own table.
- Order `status` is free text with a null default; it should be one value from a fixed set with a real default.
- Customer `email` has no unique constraint.
- Order has no created or updated timestamps.
- Order's `customer_id` is an integer while Customer's key is a uuid, so the reference cannot work.
