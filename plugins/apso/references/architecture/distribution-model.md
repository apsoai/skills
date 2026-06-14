# Apso Distribution Model — Generate / Library / Skill

How Apso decides **where a piece of code lives** and **how a developer updates it**. This is the contract behind every Apso feature. If you're adding a capability to the platform, decide which plane it belongs to *first*.

## The core idea

Sort code by **rate of change** and **source of truth**, then pick the distribution channel whose update mechanism matches. There are three planes, plus the developer's own app.

| Plane | What lives here | Source of truth | How it updates | Consistency comes from |
|---|---|---|---|---|
| **Generated** (CLI) | Schema-derived code: entities, DTOs, controllers, services, modules | `.apsorc` | `apso generate` (re-run) | Mechanical — same templates every time |
| **Library** (packages) | Stable runtime/engine & architecture patterns: domain events, outbox + delivery, caching, idempotency, etc. | A versioned package | `npm / pip / go get` update (semver) | The library is byte-identical everywhere it's installed |
| **Skill** (skills repo) | The *recommended pattern* and the *wiring* that composes generated code + a library | Skill definitions | Re-run / pull latest skill | The skill installs & wires a **pinned library**; it never reimplements engine code |
| *(App)* | Which destination, secrets, cadence, business logic | The developer | The developer owns it | — |

## The decision rule

When adding a capability, ask in order:

1. **Does it change when the *schema* changes?** → **Generated plane.** Lives in `autogen/`, never hand-edited; the update path is regeneration, which the developer already does on every schema change.
2. **Is it stable engine behavior that *Apso (or the community)* improves over time, independent of any one schema?** → **Library plane.** Ship it as a versioned package. The update path is a dependency bump, protected by semver.
3. **Is it a *decision* or *wiring* that composes the other two into a recommended architecture?** → **Skill plane.** The skill installs the library, adds the minimal wiring, and captures the choices (which transport, how to schedule, security). It must **not** hand-write engine code.
4. **Is it config/secrets/business logic?** → It's the **app's**. Document it (e.g. `.env.example`), don't generate or vendor it.

## Why not the other way around

- **Engine code must never live in the service template.** Templates are cloned once at `apso init` and *never updated* — anything placed there is frozen forever. Engine fixes would never reach the service.
- **Engine code generated into `autogen/` is workable but not ideal as the *only* channel:** regeneration is a real, safe update path, but there's no natural trigger to regenerate for an engine fix that didn't change the schema. So engine code belongs in a **library**, where `update` is the trigger.
- **A skill alone drifts.** An agent hand-wiring an engine each time produces subtly different results. The library is the consistency anchor; the skill is a thin, near-deterministic installer on top of it. Consistency — Apso's whole edge — is preserved *because the substance is in the library*.
- **We do not publish the whole codegen output as packages.** That would be a 3-language version matrix and a maintenance trap. Libraries are **per-feature and opt-in** — only services that use a feature depend on its library, one language at a time.

## Worked example: domain events

| Concern | Plane |
|---|---|
| Which entities emit events (the `emitEvents` intent) | Generated / schema input |
| The outbox `DomainEvent` model, the transactional subscriber, the relay, delivery adapters (webhook/kafka/sqs/eventbridge), the poller | **Library** — `@apso/domain-events` (+ Python/Go equivalents) |
| "Enable domain events with webhook delivery, scheduled drain, signed payloads" — install + wire | **Skill** — `domain-events` |
| `EVENTS_DESTINATION`, URLs, secrets, broker creds | App (env) |

A developer updates the delivery engine with `npm update @apso/domain-events` — not by re-cloning a template and not by hoping a regenerate picks it up.

## `.apsorc` is the feature-control plane

`.apsorc` doesn't just describe the data model — it's where the developer **signals intent**, and that intent drives both codegen *and* which libraries/skills get wired in (`scopeBy` → tenant scoping; `emitEvents` → which entities emit domain events, pulling in `@apso/domain-events` + the `domain-events` skill).

For a **library feature**, the CLI's job is small and purely schema-derived: from the `.apsorc` signal it emits a **manifest** (e.g. the list of opted-in entity classes) that the library consumes — `DomainEventsModule.forRoot({ entities })`. Engine in the library, wiring in the skill, on-switch in `.apsorc`. The flags are feature toggles, not implementations.

## What this means for contributors

- New cross-cutting capability → **library + skill**, not new CLI codegen.
- The CLI stays focused on schema-derived output.
- Every pattern skill names exactly one library + version it installs, and a minimal wiring recipe. Community libraries plug into the same skill-defined contract.
