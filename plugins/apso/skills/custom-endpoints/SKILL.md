---
name: custom-endpoints
description: Add custom business logic endpoints beyond generated CRUD. Extension controllers, services, middleware, and interceptors. Triggers on "add custom endpoint", "business logic", "custom API route", "extend the API", "add webhook".
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
import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('projects')
@Controller('projects')
export class ProjectExtensionController {
  constructor(private readonly projectService: ProjectExtensionService) {}

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive a project' })
  async archive(@Param('id') id: string) {
    return this.projectService.archive(id);
  }

  @Post(':id/clone')
  @ApiOperation({ summary: 'Clone a project with all tasks' })
  async clone(
    @Param('id') id: string,
    @Body() body: { name: string },
  ) {
    return this.projectService.clone(id, body.name);
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

  async archive(id: string) {
    const project = await this.projectRepo.findOne({ where: { id } });
    if (!project) throw new NotFoundException();
    project.status = 'archived';
    return this.projectRepo.save(project);
  }

  async clone(id: string, newName: string) {
    const project = await this.projectRepo.findOne({
      where: { id },
      relations: ['tasks'],
    });
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

Return computed data (counts, stats, summaries).

```typescript
@Get('stats')
@ApiOperation({ summary: 'Get project statistics' })
async getStats(@Req() req) {
  const orgId = req.organizationId;
  return {
    total: await this.projectRepo.count({ where: { organizationId: orgId } }),
    active: await this.projectRepo.count({ where: { organizationId: orgId, status: 'active' } }),
    archived: await this.projectRepo.count({ where: { organizationId: orgId, status: 'archived' } }),
  };
}
```

## Pattern 3: Bulk Operations

Process multiple records in one request.

```typescript
@Post('bulk/archive')
@ApiOperation({ summary: 'Archive multiple projects' })
async bulkArchive(@Body() body: { ids: string[] }) {
  await this.projectRepo
    .createQueryBuilder()
    .update()
    .set({ status: 'archived' })
    .whereInIds(body.ids)
    .execute();
  return { archived: body.ids.length };
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
async getProjectTasks(@Param('projectId') projectId: string) {
  return this.taskRepo.find({ where: { projectId } });
}

// POST /projects/:projectId/tasks
@Post(':projectId/tasks')
async createProjectTask(
  @Param('projectId') projectId: string,
  @Body() body: CreateTaskDto,
) {
  return this.taskRepo.save({ ...body, projectId });
}
```

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
