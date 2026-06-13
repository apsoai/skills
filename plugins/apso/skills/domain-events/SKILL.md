---
name: domain-events
description: Add reliable event emission to a service — transactional outbox, CRUD-lifecycle events, semantic transition events, and delivery. Triggers on "emit events", "event triggering", "domain events", "publish events on change", "transactional outbox", "webhook events", "no silent writes".
---

# Domain Events

Add reliable event emission to an Apso service. The goal is one invariant:
**every state change emits an event, and the event stream is complete — no silent writes.**

Getting this right is mostly about *durability* (the event must not be lost if the
process dies) and *taste* (which events to emit, and what shape they take). This skill
covers both. The mechanism is language-agnostic; the worked example is TypeScript /
TypeORM (the reference Apso target). Python/SQLAlchemy and Go/GORM are tracked
separately — see Related Work.

## What You Get

A service where:
- Every create/update/delete on an opted-in entity writes a durable event **in the same
  database transaction** as the state change (the transactional-outbox pattern).
- A relay publishes those events after commit, **at-least-once**, with retry/backoff.
- Consumers can **dedupe** on a stable event id.
- Mechanical CRUD events (`product.created`) and explicit semantic events
  (`payment_intent.succeeded`) both flow through the same durable spine.
- The public event contract never leaks internal or vendor-specific shapes.

## The Core Problem: the Dual-Write

The naive approach — commit the DB change, then publish the event — has a fatal gap:

```
BEGIN; UPDATE order SET status='fulfilled'; COMMIT;
  ↳ process crashes here
publish("order.fulfilled")   ← never runs. Event lost. State changed silently.
```

For a ledger, payments, or any audit-critical system this is unacceptable. The fix is the
**transactional outbox**: write the event into an `outbox` table **inside the same
transaction** as the state change. Either both land or neither does. A separate relay
reads the outbox and publishes after commit. Delivery is now decoupled from the write and
can retry safely.

```
BEGIN;
  UPDATE order SET status='fulfilled';
  INSERT INTO outbox_event (type, payload, status) VALUES ('order.fulfilled', …, 'pending');
COMMIT;                       ← atomic: state + event together
--- later, out of band ---
relay: SELECT … WHERE status='pending' → publish → mark 'published'
```

## How I Work

### Step 1: Decide the emission mechanism

Two ways to emit, with different guarantees:

| Mechanism | Same-txn? | Has request context? | Use for |
|-----------|-----------|----------------------|---------|
| **ORM lifecycle subscriber** (TypeORM `EntitySubscriber`) | **Yes** — hooks receive the active transaction's manager | No | The durable spine — CRUD-lifecycle events |
| **Post-commit HTTP interceptor** | No (fires at request boundary, after commit) | Yes (user, request id) | Enrichment only, when you accept the durability gap |

**Default to the subscriber for durability.** Use an interceptor only when you genuinely
need request context *and* can tolerate the dual-write gap (rare for event-critical data).

### Step 2: Write the outbox + same-transaction subscriber

The subscriber's `afterInsert` / `afterUpdate` / `afterRemove` hooks receive
`event.manager` — the manager bound to the *active transaction*. Writing the outbox row
through it is same-txn, atomic with the state change.

```typescript
// extension layer — survives `apso generate`
@EventSubscriber()
export class OutboxSubscriber implements EntitySubscriberInterface {
  // Skip our own bookkeeping tables or we recurse forever.
  private readonly skip = new Set(['OutboxEvent', 'IdempotencyKey']);

  private async emit(event: InsertEvent<any> | UpdateEvent<any> | RemoveEvent<any>, action: string) {
    const name = event.metadata.name;
    if (this.skip.has(name)) return;                      // recursion guard
    const repo = event.manager.getRepository(OutboxEvent); // SAME transaction
    await repo.insert({
      id: `evt_${ulid()}`,                                // stable id → consumer dedupe
      type: `${toDomain(name)}.${action}`,                // e.g. "order.created"
      payload: serialize(event.entity),                   // map at the boundary (Step 4)
      status: 'pending',
      attempts: 0,
    });
  }

  afterInsert(e: InsertEvent<any>) { return this.emit(e, 'created'); }
  afterUpdate(e: UpdateEvent<any>) { return this.emit(e, 'updated'); }
  afterRemove(e: RemoveEvent<any>) { return this.emit(e, 'deleted'); }
}
```

```typescript
@Entity()
export class OutboxEvent {
  @PrimaryColumn() id: string;              // "evt_…" — stable, dedupe key
  @Column() type: string;                   // "domain.entity.action"
  @Column('jsonb') payload: unknown;
  @Column({ default: 'pending' }) status: 'pending' | 'published' | 'failed';
  @Column({ default: 0 }) attempts: number;
  @CreateDateColumn() created_at: Date;
  @Column({ type: 'timestamptz', nullable: true }) publishedAt: Date | null;
}
```

**Critical caveats:**
- The subscriber **must skip its own tables** (outbox, idempotency) — otherwise writing an
  event triggers an event triggers an event.
- Raw `QueryBuilder` `.update()` / `.delete()` and bulk operations **bypass subscribers**.
  Any code path that must emit events has to go through the entity manager, or emit
  explicitly. Document this loudly.
- Register the subscriber **per DataSource** if the service has multiple.

### Step 3: Distinguish lifecycle events from semantic events

Not every meaningful event maps to a CRUD verb.

- **Lifecycle (mechanical):** inferred from entity + operation — `product.created`,
  `user.updated`. The subscriber emits these automatically. Cheap, complete, low-meaning.
- **Semantic (transition):** business-meaningful transitions that don't map 1:1 to a verb
  — `payment_intent.succeeded`, `order.fulfilled`, `subscription.canceled`. A row UPDATE
  can't tell you *which* transition happened. **Emit these explicitly** from the extension
  layer (your service/use-case code), writing to the **same outbox** through the active
  transaction's manager.

Rule of thumb: if a consumer cares about *the meaning of the change* (not just "the row
changed"), it's a semantic event and you emit it by hand.

### Step 4: Design the taxonomy and envelope

- **Naming:** `domain.entity.action` (e.g. `billing.invoice.paid`). Consistent, filterable,
  greppable.
- **Stable ids:** prefix + sortable id (`evt_01J…`). Consumers dedupe on this under
  at-least-once delivery.
- **A canonical envelope** wraps every event: `{ id, type, occurredAt, version, data }`.
- **Map at the boundary.** Do **not** publish your internal entity shape or a vendor's
  shape (e.g. Stripe objects) directly — that couples every consumer to your internals.
  Build the public `data` payload in a serializer at the emission point. The envelope is
  your contract; the table is not.

### Step 5: Build the relay

A background worker (cron, queue consumer, or `LISTEN/NOTIFY` loop) that:
1. Selects `status='pending'` rows (oldest first, batched, `FOR UPDATE SKIP LOCKED` to
   allow concurrent relays).
2. Publishes each (webhook POST, message bus, etc.).
3. On success → `status='published'`, set `publishedAt`. On failure → increment `attempts`,
   keep `pending` with backoff, move to `failed` past a threshold (dead-letter).
4. Is **idempotent on redelivery** — at-least-once means consumers will occasionally see
   duplicates; the stable event id is how they cope.

Delivery specifics (signing, endpoints, retry policy) are app-specific — keep them in the
extension layer.

### Step 6: Placement & safety (so it survives regeneration)

- Keep the subscriber, semantic emits, serializers, and relay in the **extension layer**,
  not in `autogen/` — so `apso generate` never overwrites your event logic.
- Recursion guard on bookkeeping tables (Step 2). 
- Document the raw-query bypass (Step 2).
- Treat the outbox as append-mostly; index `(status, created_at)` for the relay's hot query.

### Step 7: Use the generated capability (once available)

[apsoai/cli#79](https://github.com/apsoai/cli/issues/79) proposes generating this spine
from `.apsorc`:

```jsonc
{ "name": "Order", "emitEvents": true }   // generator emits outbox + EntitySubscriber + relay stub
```

When it lands, the **generator owns the mechanism** (outbox table, lifecycle subscriber,
relay scaffold) and **you supply the contract** via extension hooks: the type taxonomy, the
payload serializer (Step 4), and the delivery (Step 5). Until then, hand-roll the spine as
above — the design decisions are identical, so the work carries over.

## Quick Reference

- **Durability lever:** write the event in the *same transaction* as the state change. Everything else is secondary.
- **Subscriber for lifecycle, explicit emits for semantic** — both to the same outbox.
- **Stable event id** → consumer dedupe (delivery is at-least-once).
- **Map to a public envelope** — never leak internal/vendor shapes.
- **Guard against recursion** (skip outbox/idempotency tables) and **document the raw-query bypass**.
- **Extension layer**, so it survives `apso generate`.

## Related Work

- **apsoai/cli#79** — generated `emitEvents` capability (the mechanism this skill teaches you to drive).
- **Python / SQLAlchemy** realization — tracked separately ([apsoai/skills#3](https://github.com/apsoai/skills/issues/3)); same-txn hook via session/mapper event listeners.
- **Go / GORM** realization — tracked separately ([apsoai/skills#4](https://github.com/apsoai/skills/issues/4)); same-txn hook via model hooks.

## Related Skills

- `audit-trail` — track who changed what and when (a specialized, query-oriented sibling of the outbox)
- `notification-system` — in-app notifications, often a *consumer* of domain events
- `workflow-state` — state machines whose transitions are the canonical source of semantic events
- `custom-endpoints` — where explicit semantic emits live alongside business logic
