---
name: domain-events
category: integrations
description: Emit domain events when entities change, delivered via an outbox to webhooks, Kafka, SQS, or EventBridge. Installs and wires the @apso/domain-events library. Triggers on "domain events", "emit events", "outbox", "publish events on change", "event-driven", "fire an event when X changes", "CDC", "change data capture".
---

# Domain Events

Emit reliable domain events when entities are created, updated, or deleted, using a transactional outbox with at-least-once delivery to one or more destinations (webhook, Kafka, SQS, EventBridge).

This skill is a **thin installer and wirer** for the `@apso/domain-events` library. It does NOT reimplement event logic. The library is the consistency anchor and owns the outbox table, the relay, signing, and the delivery adapters. Your job is to install the pinned library, wire one module, and set environment variables.

> Distribution model: the CLI generates schema-derived code (the manifest), engine patterns ship as versioned libraries (`@apso/domain-events`), and skills install + wire a pinned library. Never copy engine code into the project. See the contract at `apsoai/apso-packages` (`CONTRACT.md`).

## Step 1: Recognize the Intent and Confirm the Signal

Use this skill when the user wants entity changes to produce events ("emit an event when an order is placed", "publish to Kafka on update", "add an outbox", "event-driven integration").

The signal that the project is ready is twofold:

1. **`.apsorc` has `emitEvents` on the desired entities.** Each entity that should produce events must opt in:

   ```json
   {
     "name": "Order",
     "emitEvents": true,
     "created_at": true,
     "updated_at": true,
     "fields": [
       { "name": "status", "type": "enum", "values": ["pending", "paid", "shipped"], "default": "pending" },
       { "name": "total", "type": "decimal" }
     ]
   }
   ```

   If `emitEvents` is missing, add it to the entities the user named, then run `apso generate`.

2. **`apso generate` has produced the manifest.** Confirm the generated manifest exists:

   ```
   src/autogen/events/event-emitting.entities.ts
   ```

   It exports `EVENT_EMITTING_ENTITIES` — the list of entity classes the library subscribes to. If the file is missing, the user has not run `apso generate` after setting `emitEvents`; run it.

## Step 2: Install the Pinned Library

```bash
npm install @apso/domain-events
```

> Pin a specific version once published (e.g. `@apso/domain-events@1.0.0`) so the skill recipe and the library contract stay in lockstep. Never edit files inside `node_modules/@apso/domain-events`.

## Step 3: Wire the Module

Add `DomainEventsModule.forRoot(...)` to the application module imports, passing the generated manifest. This is the only code change.

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { DomainEventsModule } from '@apso/domain-events';
import { EVENT_EMITTING_ENTITIES } from './autogen/events/event-emitting.entities';

@Module({
  imports: [
    // ...existing imports
    DomainEventsModule.forRoot({ entities: EVENT_EMITTING_ENTITIES }),
  ],
})
export class AppModule {}
```

That is the entire wiring. The library registers the outbox entity, subscribes to the listed entities, and starts the relay.

## Step 4: Configure Delivery via Environment Only

Delivery is configured by environment variables — no code. Choose one or more destinations with `EVENTS_DESTINATION` (comma-separated for fan-out):

```bash
EVENTS_DESTINATION=webhook            # single destination
EVENTS_DESTINATION=webhook,kafka,sqs  # fan-out to multiple
```

Supported values: `webhook`, `kafka`, `sqs`, `eventbridge`.

Then set the per-destination variables for each one you selected:

**Webhook** — uses [Standard Webhooks](https://www.standardwebhooks.com/) signing; no extra dependency needed.
```bash
EVENTS_WEBHOOK_URL=https://example.com/hooks/apso
EVENTS_WEBHOOK_SECRET=whsec_...        # used to sign the payload
```

**Kafka** — requires the Kafka client lib installed (`npm install kafkajs`).
```bash
EVENTS_KAFKA_BROKERS=broker1:9092,broker2:9092
EVENTS_KAFKA_TOPIC=domain-events
EVENTS_KAFKA_CLIENT_ID=my-service      # optional
EVENTS_KAFKA_SSL=true                  # optional
EVENTS_KAFKA_SASL_MECHANISM=plain      # optional
EVENTS_KAFKA_USERNAME=...              # optional
EVENTS_KAFKA_PASSWORD=...              # optional
```

**SQS / EventBridge** — require the AWS SDK client for that service installed (`@aws-sdk/client-sqs` or `@aws-sdk/client-eventbridge`) plus standard AWS credentials/region.
```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# SQS
EVENTS_SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789012/domain-events

# EventBridge
EVENTS_EVENTBRIDGE_BUS_NAME=default
EVENTS_EVENTBRIDGE_SOURCE=apso.domain-events
```

Only the webhook destination ships with no extra dependency. Each broker/cloud destination needs its client library installed before use.

## Step 5: Key Semantics (Tell the User)

- **At-least-once delivery.** The outbox guarantees an event is delivered at least once. Duplicates are possible (e.g. a relay retry after a partial failure).
- **Dedupe on `event.id` with multiple destinations.** When `EVENTS_DESTINATION` has more than one value, the same logical event is delivered once per destination. **Consumers MUST dedupe on `event.id`** to stay idempotent.
- **The relay self-schedules.** It polls and drains the outbox on its own interval — you do NOT need to add a separate cron, `@nestjs/schedule`, or any external scheduler.
- **Override the mapper to customize events.** The default mapper derives the event `type` (e.g. `order.created`) and `payload` from the entity change. To customize the event type, payload shape, or filtering, provide a custom mapper in `forRoot` rather than editing generated or library code. See the library `CONTRACT.md` for the mapper signature.

## What Not to Do

- Do not write outbox tables, relay loops, signing code, or delivery adapters by hand — they live in `@apso/domain-events`.
- Do not edit `src/autogen/events/event-emitting.entities.ts`; it is regenerated by `apso generate`. Change which entities emit by toggling `emitEvents` in `.apsorc` and regenerating.
- Do not add a scheduler for the relay; it self-schedules.

## Reference

- Library contract: `apsoai/apso-packages` → `CONTRACT.md` (event envelope, `event.id`, mapper signature, env var names).
- Distribution model: CLI generates schema-derived code; engine patterns ship as versioned libraries; skills install + wire a pinned library and never reimplement engine code. See `references/architecture/taxonomy.md` for how this skill is categorized.
