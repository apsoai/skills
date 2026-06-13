---
name: api-builder
description: Generate a production-ready REST API from a schema. Creates endpoints, models, validation, DTOs, and OpenAPI docs. Triggers on "build the API", "scaffold the backend", "generate the server", "create REST API", "set up the backend".
---

# API Builder

Generate a complete REST API from a schema definition. Creates a project with CRUD endpoints, validation, OpenAPI documentation, and a local development environment.

## What You Get

- REST API with CRUD endpoints for every entity
- TypeORM models with relationships
- Input validation via DTOs
- OpenAPI/Swagger documentation
- Docker Compose for local PostgreSQL
- Hot-reload development server

## Setup Process

### Step 1: Initialize Project

```bash
# Install CLI
npm install -g @apso/cli

# Create new project
apso init --name my-api --language typescript

# Navigate to project
cd my-api
```

### Step 2: Define Schema

Create or edit `.apsorc` in the project root. Use the `schema-designer` skill to generate this from requirements, or write it manually.

See `references/apso-schema-guide.md` for the complete format reference.

### Step 3: Generate Code

```bash
apso generate
```

This creates files in `src/autogen/`:
- `{Entity}/` directory per entity
  - `{Entity}.entity.ts` — TypeORM entity
  - `{Entity}.service.ts` — CRUD service
  - `{Entity}.controller.ts` — REST controller with OpenAPI decorators
  - `{Entity}.module.ts` — NestJS module
  - `dtos/{Entity}.dto.ts` — Create/Update DTOs with validation
- `guards/` — Auth and scope guards (when auth or scopeBy is configured)
- `enums/` — Enum type definitions
- `index.ts` — Root module

Files in `autogen/` are overwritten on every `apso generate`. Custom code goes in `src/extensions/`.

### Step 4: Install Dependencies

```bash
npm install
```

### Step 5: Start Development

```bash
# Start PostgreSQL + API server via Docker Compose
apso dev

# Or start individually:
npm run compose      # PostgreSQL container
npm run provision    # Create tables
npm run start:dev    # NestJS server with hot reload
```

### Step 6: Verify

```bash
# Health check
curl http://localhost:3001/health

# OpenAPI docs
open http://localhost:3001/api/docs

# Test CRUD
curl http://localhost:3001/{entities}
```

## Generated API Endpoints

For each entity, you get:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/{entities}` | List all (paginated) |
| `GET` | `/{entities}/:id` | Get by ID |
| `POST` | `/{entities}` | Create new |
| `PUT` | `/{entities}/:id` | Full update |
| `PATCH` | `/{entities}/:id` | Partial update |
| `DELETE` | `/{entities}/:id` | Delete |

### Query Parameters

- `?page=1&limit=10` — Pagination
- `?sort=created_at&order=desc` — Sorting
- `?status=active` — Field filtering
- `?search=keyword` — Full-text search
- `?include=organization,user` — Eager load relations

## Adding Custom Endpoints

Custom business logic goes in `src/extensions/`:

```typescript
// src/extensions/Project/Project.controller.ts
import { Controller, Post, Param } from '@nestjs/common';

@Controller('projects')
export class ProjectController {
  @Post(':id/archive')
  async archive(@Param('id') id: string) {
    return this.projectService.archive(id);
  }
}
```

Extension files survive `apso generate` runs. The generated module automatically imports extensions when they exist.

## Schema Changes

When you modify `.apsorc`:

```bash
# Regenerate code
apso generate

# Test migrations locally (PGlite sandbox)
apso migrate

# Apply migration snapshot
apso migrate --apply
```

## Deployment

```bash
# Deploy to Apso platform (AWS)
apso deploy
```

This builds, runs migrations, and deploys to Lambda + RDS + API Gateway. See the `deployment` skill for details.

## Supported Languages

| Language | Framework | Status |
|----------|-----------|--------|
| TypeScript | NestJS + TypeORM | Production-ready |
| Python | FastAPI + SQLAlchemy | In development |
| Go | Gin + GORM | In development |
