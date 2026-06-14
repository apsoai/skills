---
name: domain-events
category: integrations
description: Add reliable event emission to a service — transactional outbox, CRUD-lifecycle events, semantic transition events, and config-selected delivery (webhook/Kafka/SQS/EventBridge). Installs and wires the @apso/domain-events library. Triggers on "emit events", "event triggering", "domain events", "publish events on change", "transactional outbox", "webhook events", "no silent writes".
---

# Domain Events

Add reliable event emission to an Apso service. The goal is one invariant:
**every state change emits an event, and the event stream is complete — no silent writes.**

Getting this right is mostly about *durability* (the event must not be lost if the
process dies) and *taste* (which events to emit, and what shape they take). This skill
covers both. The mechanism is language-agnostic; the worked example is TypeScript /
TypeORM (the reference Apso target). Python/SQLAlchemy and Go/GORM mirror it — see Related Work.

> **The durable spine + delivery is a LIBRARY, not generated code.** The engine ships as
> [`@apso/domain-events`](https://github.com/apsoai/apso-packages) (per the [Apso Distribution
> Model](../../references/architecture/distribution-model.md)). Opting an entity into
> `emitEvents` in `.apsorc` makes the CLI emit a tiny **manifest** of opted-in entities
> (`autogen/events/event-emitting.entities.ts`); you `npm install @apso/domain-events` and
> wire `DomainEventsModule.forRoot({ entities })`. **This skill installs + wires the library
> — it never reimplements the engine** (the library is the consistency anchor). Your job is
> the *contract* (the mapper) and *semantic* events; delivery is env config. Steps 2–5 are the
> conceptual model behind the library — read them to understand it; Step 7 is what you actually do.

## What You Get

A service where:
- Every create/update/delete on an opted-in entity writes a durable event **in the same
  database transaction** as the state change (the transactional-outbox pattern).
- A relay publishes those events after commit, **at-least-once**, with retry/backoff, on a
  self-contained schedule (no extra scheduler dependency).
- Delivery is selected at runtime (`EVENTS_DESTINATION`): webhook (Standard Webhooks signed),
  Kafka, SQS, or EventBridge — fan out to several at once.
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
**transactional outbox**: write the event into an `events` table **inside the same
transaction** as the state change. Either both land or neither does. A separate relay
reads the table and publishes after commit. Delivery is now decoupled from the write and
can retry safely.

```
BEGIN;
  UPDATE order SET status='fulfilled';
  INSERT INTO events (type, payload, status) VALUES ('order.fulfilled', …, 'pending');
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

**Default to the subscriber for durability** (this is what the library uses). Use an
interceptor only when you genuinely need request context *and* can tolerate the dual-write
gap (rare for event-critical data).

### Step 2: The outbox + same-transaction subscriber (what the library does)

The subscriber's `afterInsert` / `afterUpdate` / `afterRemove` hooks receive
`event.manager` — the manager bound to the *active transaction*. Writing the outbox row
through it is same-txn, atomic with the state change.

This is exactly what `@apso/domain-events` implements (you don't write it — read it as the
conceptual model):

```typescript
// Inside @apso/domain-events — shown for understanding, NOT to hand-copy.
@EventSubscriber()
export class DomainEventSubscriber implements EntitySubscriberInterface {
  // Skip the outbox table or we recurse forever; only opted-in entities emit.
  private async emit(event: InsertEvent<any> | UpdateEvent<any> | RemoveEvent<any>, action: string) {
    const name = event.metadata.name;
    if (name === 'DomainEvent' || !this.isEmitting(name)) return;   // recursion guard + scope
    const repo = event.manager.getRepository(DomainEvent);          // SAME transaction
    await repo.insert({
      type: this.mapper.eventType(name, action),                   // overridable mapper
      payload: this.mapper.toPayload(event.entity, action),
      status: 'pending',
      attempts: 0,
    });                                                             // uuid PK → consumer dedupe key
  }
}
```

```typescript
@Entity('events')
@Index(['status', 'created_at'])            // relay polling hot path
export class DomainEvent {
  @PrimaryGeneratedColumn('uuid') id: string;  // stable id → consumer dedupe key
  @Column() type: string;                      // "domain.entity.action"
  @Column('jsonb') payload: unknown;
  @Column({ default: 'pending' }) status: 'pending' | 'published' | 'failed';
  @Column({ default: 0 }) attempts: number;
  @CreateDateColumn({ type: 'timestamptz' }) created_at: Date;
  @Column({ type: 'timestamptz', nullable: true }) publishedAt: Date | null;
}
```

**Critical caveats (the library handles the first two; you own the rest):**
- The subscriber **skips the `events` table** and only fires for entities you opted in —
  no infinite recursion.
- Raw `QueryBuilder` `.update()` / `.delete()` and bulk operations **bypass subscribers**.
  Any code path that must emit events has to go through the entity manager, or emit
  explicitly. Document this loudly.
- Register `DomainEventsModule` **per DataSource** if the service has multiple (the
  subscriber auto-registers on the default DataSource; named ones need wiring).

### Step 3: Distinguish lifecycle events from semantic events

Not every meaningful event maps to a CRUD verb.

- **Lifecycle (mechanical):** inferred from entity + operation — `product.created`,
  `user.updated`. The subscriber emits these automatically. Cheap, complete, low-meaning.
- **Semantic (transition):** business-meaningful transitions that don't map 1:1 to a verb
  — `payment_intent.succeeded`, `order.fulfilled`, `subscription.canceled`. A row UPDATE
  can't tell you *which* transition happened. **Emit these explicitly** from your
  service/use-case code, writing to the **same `events` table** through the active
  transaction's manager.

Rule of thumb: if a consumer cares about *the meaning of the change* (not just "the row
changed"), it's a semantic event and you emit it by hand.

### Step 4: Design the taxonomy and envelope (your contract — override the mapper)

- **Naming:** `domain.entity.action` (e.g. `billing.invoice.paid`). Consistent, filterable,
  greppable.
- **Stable ids:** the `events.id` uuid. Consumers dedupe on it under at-least-once delivery.
- **Map at the boundary.** Do **not** publish your internal entity shape or a vendor's shape
  (e.g. Stripe objects) directly — that couples every consumer to your internals. Set the
  public type taxonomy and payload by **providing your own `DomainEventMapper`** under the
  `DOMAIN_EVENT_MAPPER` token (the default uses `entity.action` + the entity as-is). The
  mapper is your contract; the table is not.

### Step 5: Delivery (config, not code)

The library's `DomainEventRelay` drains `status='pending'` rows on a self-contained poller
and fans each out to the **active destinations**, selected at runtime:
- `EVENTS_DESTINATION=webhook` (Standard Webhooks HMAC-signed POST to `EVENTS_WEBHOOK_URL`),
  `kafka`, `sqs`, `eventbridge`, or a comma-list to fan out.
- On success → `published` + `publishedAt`; on failure → `attempts++`, then `failed` past
  `MAX_ATTEMPTS`.
- **At-least-once, and with multiple destinations the relay re-sends to all on retry — so
  consumers MUST dedupe on `event.id`.**

You normally don't write delivery code — pick a destination via env and set its vars. You
*can* override the mapper for payload/type, and (rarely) subclass the relay.

### Step 6: Where things live

- The **engine** (subscriber, relay, adapters, poller) lives in `@apso/domain-events`
  (node_modules) — updated via `npm update`, not regeneration.
- The CLI generates only the **manifest** (`autogen/events/event-emitting.entities.ts`) from
  your `.apsorc` `emitEvents` flags.
- **Your code** owns: the `forRoot(...)` wiring, the mapper override (contract), explicit
  semantic emits, and env config. None of it is overwritten by `apso generate`.

### Step 7: Wire it up (TypeScript)

1. **Signal in `.apsorc`** — opt entities in:
   ```jsonc
   {
     "emitEvents": true,                          // global default (optional)
     "entities": [
       { "name": "Order", "fields": [/* … */] },  // inherits global → emits
       { "name": "AuditLog", "emitEvents": false } // per-entity opt-out
     ]
   }
   ```
   Effective per entity = `entity.emitEvents ?? <top-level emitEvents> ?? false`.

2. **Generate the manifest** — `apso generate` writes `src/autogen/events/event-emitting.entities.ts`
   exporting `EVENT_EMITTING_ENTITIES` (the opted-in entity classes). No engine code is generated.

3. **Install the library** — `npm install @apso/domain-events` (pin the version).

4. **Wire it** — in your app module:
   ```typescript
   import { DomainEventsModule } from '@apso/domain-events';
   import { EVENT_EMITTING_ENTITIES } from './autogen/events/event-emitting.entities';

   @Module({
     imports: [
       DomainEventsModule.forRoot({ entities: EVENT_EMITTING_ENTITIES }),
       // … your other modules
     ],
   })
   export class AppModule {}
   ```
   Optionally pass `{ mapper: MyMapper, pollIntervalMs: 5000 }`.

5. **Configure delivery (env)** — e.g. `EVENTS_DESTINATION=webhook`, `EVENTS_WEBHOOK_URL=…`,
   `EVENTS_WEBHOOK_SECRET=whsec_…` (webhook needs no extra dependency; Kafka/SQS/EventBridge
   pull their client lib only when activated).

6. **Customize the contract** — provide your own `DomainEventMapper` (Step 4) and emit
   **semantic events** (Step 3) from business code via the active transaction's manager.

**Division of labor: the library owns the mechanism + transports; you own the contract and
the semantic events.**

## Quick Reference

- **Durability lever:** events are written in the *same transaction* as the state change. The library guarantees this; everything else is secondary.
- **Subscriber for lifecycle, explicit emits for semantic** — both to the same `events` table.
- **Stable event id** → consumer dedupe (delivery is at-least-once; multi-destination amplifies duplicates).
- **Override the mapper** to set your public taxonomy + payload — never leak internal/vendor shapes.
- **Delivery is env config** (`EVENTS_DESTINATION`), not code.
- **Document the raw-query bypass**; register per DataSource if multiple.
- **Install + wire the library — never hand-reimplement the engine.**

## Related Work

- **`@apso/domain-events`** (TypeScript) — the engine this skill installs: [apsoai/apso-packages](https://github.com/apsoai/apso-packages) (`typescript/packages/domain-events`).
- **CLI manifest** — `apso generate` emits `EVENT_EMITTING_ENTITIES` instead of the engine ([apsoai/cli#91](https://github.com/apsoai/cli/issues/91)). Supersedes the earlier generated-engine approach (cli#79/#80).
- **Python / SQLAlchemy** and **Go / GORM** — sibling libraries in the same monorepo (`python/packages/domain-events`, `go/domainevents`); same contract, language-idiomatic same-txn hooks. Tracked at apsoai/cli#81 / #82.
- Architecture rationale: [Apso Distribution Model](../../references/architecture/distribution-model.md).

## Related Skills

- `audit-trail` — track who changed what and when (a specialized, query-oriented sibling of the outbox)
- `notification-system` — in-app notifications, often a *consumer* of domain events
- `workflow-state` — state machines whose transitions are the canonical source of semantic events
- `custom-endpoints` — where explicit semantic emits live alongside business logic
