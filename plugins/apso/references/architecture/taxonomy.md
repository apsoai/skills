# Skills Taxonomy

How the skills in this plugin are organized and discovered.

## Buckets (locked)

Every shippable skill is assigned to exactly one of four locked categories. The buckets describe the user intent the skill serves, not its implementation.

| Category | Purpose | Skills |
|----------|---------|--------|
| **data** | Schema design and data-modeling patterns | `schema-designer`, `schema-review`, `multi-tenancy`, `hierarchical-data`, `tagging-taxonomy`, `soft-delete`, `audit-trail`, `workflow-state` |
| **api** | Generating and extending the REST API surface | `api-builder`, `custom-endpoints` |
| **auth** | Authentication and authorization | `auth-setup`, `auth-entities` |
| **integrations** | Wiring the API to the outside world | `notification-system`, `file-storage`, `domain-events` |

The four buckets are **locked**: new skills are assigned to one of these, not to new top-level categories. If a skill does not fit, that is a signal to reconsider the skill's scope rather than to grow the taxonomy.

## Decision: flat folders + category metadata

Skills stay in a **flat folder layout** under `skills/<skill-name>/SKILL.md`. We do NOT nest skill folders inside category directories (e.g. `skills/data/soft-delete/`).

Rationale: physical nesting can break plugin discovery — the plugin loader walks `skills/` for skill folders, and an extra directory level changes the discovered skill paths. Categorization is therefore carried as **metadata**, not as directory structure:

- Each `SKILL.md` declares its bucket with a `category:` key in the YAML frontmatter, alongside `name` and `description`.
- The folder layout remains flat and stable.

This keeps discovery working while still letting tools group, filter, or document skills by category.

### Frontmatter shape

```yaml
---
name: domain-events
category: integrations
description: ...
---
```

Only `name`, `description`, and `category` are used. `category` must be one of: `data`, `api`, `auth`, `integrations`, or `uncategorized`.

## Held-back tier: ops / solutions (uncategorized)

Two skills are intentionally **left uncategorized**: `deployment` and `billing-subscription`. They belong to a deferred **ops / solutions** enterprise tier that is not part of the four locked buckets yet.

These carry `category: uncategorized` (or omit the key). They are not assigned to `data`/`api`/`auth`/`integrations` because:

- `deployment` is an operational concern (infra provisioning, production rollout), not a build-time data/API/auth/integration pattern.
- `billing-subscription` is a packaged solution vertical that spans data + integrations + ops; it is held back until the ops/solutions tier is designed.

When the ops/solutions tier is formalized, these skills will get real categories. Until then they remain discoverable but uncategorized.

## Distribution model context

This taxonomy sits inside the broader distribution model:

- The **CLI** generates schema-derived code (e.g. the `event-emitting.entities.ts` manifest).
- **Engine patterns** ship as versioned libraries (e.g. `@apso/domain-events`).
- **Skills** install and wire a pinned library and never reimplement engine code.

Categories describe what a skill is *for* (data/api/auth/integrations); the distribution model describes *how* a skill delivers it (install + wire a pinned library). The `integrations` bucket in particular leans heavily on the library-installer pattern.
