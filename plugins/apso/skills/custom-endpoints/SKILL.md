---
name: custom-endpoints
category: api
description: Add custom business logic endpoints beyond generated CRUD, or replace a generated endpoint with a hand-written one, including report, dashboard and stats endpoints that run hand-written SQL. Extension controllers, services, middleware, and interceptors. Use before writing any SQL query for an Apso service. Triggers on "add custom endpoint", "business logic", "custom API route", "extend the API", "add webhook", "replace generated endpoint", "override CRUD", "custom controller", "Stripe-shaped API", "reporting endpoint", "write the SQL", "aggregate query", "dashboard stats".
---

# Custom Endpoints

Add business logic beyond generated CRUD. Custom controllers and services go in `src/extensions/` and survive code regeneration.

## How Extensions Work

Generated code lives in `src/autogen/`. Custom code lives in `src/extensions/`. When you run `apso generate`, everything in `autogen/` is overwritten. Everything in `extensions/` is preserved.

```
src/
  autogen/           ← Overwritten on every generate (NEVER edit)
    Project/
      Project.entity.ts
      Project.service.ts
      Project.controller.ts
      Project.module.ts
  extensions/        ← Your custom code (safe to edit)
    Project/
      Project.controller.ts   (adds custom endpoints)
      Project.service.ts      (adds business logic)
```

The generated module automatically imports extension controllers and services when they exist.

## Pattern 1: Custom Action Endpoint

Add a non-CRUD action to an entity (archive, publish, assign, clone).

```typescript
// src/extensions/Project/Project.controller.ts
import { Controller, Post, Param, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('projects')
@Controller('projects')
export class ProjectExtensionController {
  constructor(private readonly projectService: ProjectExtensionService) {}

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive a project' })
  async archive(@Param('id') id: string, @Req() req) {
    return this.projectService.archive(id, req.organizationId);
  }

  @Post(':id/clone')
  @ApiOperation({ summary: 'Copy a project (not its tasks)' })
  async clone(
    @Param('id') id: string,
    @Body() body: { name: string },
    @Req() req,
  ) {
    return this.projectService.clone(id, body.name, req.organizationId);
  }
}
```

```typescript
// src/extensions/Project/Project.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../autogen/Project/Project.entity';

@Injectable()
export class ProjectExtensionService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  // Extension code bypasses the generated scopeBy filter. Put the caller's
  // organizationId in every where clause, or any caller can read or change
  // another tenant's row by guessing its id.
  async archive(id: string, organizationId: string) {
    const project = await this.projectRepo.findOne({ where: { id, organizationId } });
    if (!project) throw new NotFoundException();
    project.status = 'archived';
    return this.projectRepo.save(project);
  }

  async clone(id: string, newName: string, organizationId: string) {
    // Don't load relations here: spreading a loaded `tasks` array into the copy
    // and saving it would re-point the original tasks at the new project.
    const project = await this.projectRepo.findOne({ where: { id, organizationId } });
    if (!project) throw new NotFoundException();

    const cloned = this.projectRepo.create({
      ...project,
      id: undefined,
      name: newName,
      created_at: undefined,
      updated_at: undefined,
    });
    return this.projectRepo.save(cloned);
  }
}
```

## Pattern 2: Aggregation Endpoint

Return computed data (counts, stats, summaries). Compute several counts over one table in one query with `FILTER`, not one round trip each.

```typescript
@Get('stats')
@ApiOperation({ summary: 'Get project statistics' })
async getStats(@Req() req) {
  const [row] = await this.projectRepo.query(
    `SELECT count(*) AS total,
            count(*) FILTER (WHERE status = 'active') AS active,
            count(*) FILTER (WHERE status = 'archived') AS archived
     FROM project
     WHERE "organizationId" = $1`,
    [req.organizationId],
  );
  // count() is a bigint, which the driver returns as a string.
  return { total: Number(row.total), active: Number(row.active), archived: Number(row.archived) };
}
```

## Pattern 3: Bulk Operations

Process multiple records in one request.

```typescript
@Post('bulk/archive')
@ApiOperation({ summary: 'Archive multiple projects' })
async bulkArchive(@Body() body: { ids: string[] }, @Req() req) {
  const result = await this.projectRepo
    .createQueryBuilder()
    .update()
    .set({ status: 'archived' })
    .whereInIds(body.ids)
    .andWhere('"organizationId" = :org', { org: req.organizationId })
    .execute();
  // Report what changed: ids from another tenant or already deleted are skipped.
  return { archived: result.affected ?? 0 };
}
```

## Pattern 4: Webhook Receiver

Accept incoming webhooks from external services (Stripe, GitHub, etc.).

```typescript
// src/extensions/Webhook/Webhook.controller.ts
@Controller('webhooks')
export class WebhookController {
  @Post('stripe')
  @ApiOperation({ summary: 'Handle Stripe webhook' })
  async handleStripe(
    @Body() body: any,
    @Headers('stripe-signature') signature: string,
  ) {
    // Verify signature
    // Process event
    return { received: true };
  }
}
```

## Pattern 5: Nested Resource Endpoints

Access child resources through the parent URL.

```typescript
// GET /projects/:projectId/tasks
@Get(':projectId/tasks')
async getProjectTasks(@Param('projectId') projectId: string, @Req() req) {
  return this.taskRepo.find({
    where: { projectId, organizationId: req.organizationId },
    order: { created_at: 'DESC', id: 'DESC' },
    take: 50,
  });
}

// POST /projects/:projectId/tasks
@Post(':projectId/tasks')
async createProjectTask(
  @Param('projectId') projectId: string,
  @Body() body: CreateTaskDto,
  @Req() req,
) {
  // The project must belong to the caller's tenant before a task can join it.
  const project = await this.projectRepo.findOne({ where: { id: projectId, organizationId: req.organizationId } });
  if (!project) throw new NotFoundException();
  return this.taskRepo.save({ ...body, projectId, organizationId: req.organizationId });
}
```

## Pattern 6: Report Query (hand-written SQL)

When a report joins or aggregates across tables, write one SQL query and run it with the repository's `query`. Read `${CLAUDE_PLUGIN_ROOT}/references/postgres-performance.md` first: its table of wrong-result mistakes (filters on a LEFT JOIN, `NOT IN` with NULLs, joining two child tables before summing, `BETWEEN` on timestamps) applies to every query you write here.

```typescript
// Every project with its open task count and logged hours, including
// projects with neither.
@Get('report')
async report(@Req() req) {
  return this.projectRepo.query(
    `SELECT p.id, p.name,
            (SELECT count(*) FROM task t
              WHERE t."projectId" = p.id AND t.status <> 'done') AS "openTasks",
            coalesce((SELECT sum(e.hours) FROM time_entry e
              WHERE e."projectId" = p.id), 0) AS hours
     FROM project p
     WHERE p."organizationId" = $1
     ORDER BY p.name, p.id`,
    [req.organizationId],
  );
}
```

- Pass every value as a `$n` parameter; never build SQL with string interpolation.
- Filter the root table by `req.organizationId`. Raw SQL skips the generated `scopeBy` filter.
- Quote camelCase columns (`"projectId"`) and the `"user"` table. Tables are snake_case (`time_entry`).
- Aggregate each child table in its own subquery. Joining `task` and `time_entry` to `project` in one `FROM` and summing multiplies the rows.
- End every `ORDER BY` with a unique column so pages and ties are stable.

## Replacing a generated endpoint (not just adding)

The patterns above are *additive* — new routes alongside the generated CRUD. To
**replace** an entity's generated endpoint with your own shape (custom envelope,
Stripe-style prefixed ids, idempotency), the approach depends on the framework,
because some can override a route in place and some can't:

- **NestJS (TypeScript):** set `"http": false` on the entity in `.apsorc` and
  regenerate. The generator still emits the entity, service, DTOs, and module
  (repository + service stay wired) but **omits the controller**, so your
  hand-written controller owns the route with no collision. NestJS controllers
  aren't DI-swappable and Express resolves a same-path collision by registration
  order, so suppression is the supported path.
- **FastAPI (Python):** no flag needed — FastAPI matches routes in **registration
  order**. Register your `APIRouter` for the path **before** the generated
  `autogen_router` is included in `main.py`, and yours wins. (`http: false` is a
  no-op here.)
- **Gin (Go):** Gin **panics** on a duplicate method+path, so you can't override
  by re-registering. Suppress the generated route with `"http": false`
  (tracked in apsoai/cli#95) and register your own.

Rule of thumb: **add** with the patterns above; **replace** by suppressing the
generated controller (NestJS / Gin) or by registration order (FastAPI).

## Extension Structure

Keep extension files mirroring the entity structure:

```
src/extensions/
  Project/
    Project.controller.ts   ← Custom endpoints
    Project.service.ts      ← Business logic
  User/
    User.controller.ts
    User.service.ts
  Webhook/
    Webhook.controller.ts   ← External integrations
  common/
    decorators/             ← Custom decorators
    interceptors/           ← Response transformation
    pipes/                  ← Input validation
```
