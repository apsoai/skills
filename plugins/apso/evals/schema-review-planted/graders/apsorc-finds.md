---
type: llm
---

The review flags at least three of these Apso schema problems with the correct Apso fix:
1. The hand-declared `id` field (uuid, primary) should be removed: Apso generates the key, and `"primaryKeyType": "uuid"` on the entity selects a uuid key.
2. `customer_id` is a hand-written foreign key; Order to Customer belongs in the `relationships` array instead.
3. Customer and Order are tenant data under Organization but have no `scopeBy` (e.g. `"scopeBy": "organizationId"`).
4. `"default": null` on `status` should be removed or replaced with a real value.
In Apso, `text`, `varchar`, `string`, `date`, `timestamp` and `timestamptz` are all valid field types.
Fail if the review says `varchar`, `string` or `timestamp` must be replaced because they are not valid Apso types.
