---
type: llm
---

Judge the design in the response, independent of any framework.
- It uses a transactional outbox: the event row is written in the same database transaction as the state change, and a relay delivers it after commit.
- Delivery is at least once, so consumers dedupe on the event id.
- The "order paid" event is emitted explicitly from the business code that performs the transition, inside that transaction, because a row update alone does not say which transition happened.
Fail if it publishes to the webhook directly after saving (a dual write).
