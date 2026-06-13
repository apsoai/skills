---
name: workflow-state
description: Add state machine and workflow entities to a schema. Status transitions, approval chains, and pipeline stages. Triggers on "state machine", "workflow", "status transitions", "approval process", "pipeline stages", "kanban".
---

# Workflow and State Machine Patterns

Model status transitions, approval chains, and pipeline stages.

## Pattern 1: Simple Status Enum

The most common pattern. A single enum field tracks the current state.

```json
{
  "name": "Task",
  "created_at": true,
  "updated_at": true,
  "scopeBy": "organizationId",
  "fields": [
    { "name": "title", "type": "text", "length": 200 },
    { "name": "status", "type": "enum", "values": ["backlog", "todo", "in_progress", "review", "done", "canceled"], "default": "backlog" }
  ],
  "indexes": [
    { "fields": ["organizationId", "status"] },
    { "fields": ["projectId", "status"] }
  ]
}
```

Transition rules are enforced in application code (service layer), not in the schema.

**When to use:** Simple workflows where the status list is fixed and transitions don't need audit trails.

## Pattern 2: Status with Transition History

Track every status change as a separate record.

```json
{
  "entities": [
    {
      "name": "Deal",
      "created_at": true,
      "updated_at": true,
      "scopeBy": "organizationId",
      "fields": [
        { "name": "name", "type": "text", "length": 200 },
        { "name": "value", "type": "decimal", "precision": 12, "scale": 2 },
        { "name": "stage", "type": "enum", "values": ["lead", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"], "default": "lead" },
        { "name": "stageEnteredAt", "type": "date" }
      ],
      "indexes": [
        { "fields": ["organizationId", "stage"] }
      ]
    },
    {
      "name": "DealStageChange",
      "created_at": true,
      "scopeBy": "organizationId",
      "fields": [
        { "name": "fromStage", "type": "text", "length": 30 },
        { "name": "toStage", "type": "text", "length": 30 },
        { "name": "reason", "type": "text", "nullable": true },
        { "name": "durationInStage", "type": "integer", "nullable": true }
      ],
      "indexes": [
        { "fields": ["dealId", "created_at"] }
      ]
    }
  ],
  "relationships": [
    { "from": "Deal", "to": "DealStageChange", "type": "OneToMany" },
    { "from": "DealStageChange", "to": "Deal", "type": "ManyToOne" },
    { "from": "DealStageChange", "to": "User", "type": "ManyToOne", "to_name": "changedBy" }
  ]
}
```

**When to use:** CRM pipelines, support tickets, hiring pipelines. Anywhere you need to analyze time-in-stage or transition patterns.

## Pattern 3: Custom Pipeline Stages

Let organizations define their own stages instead of using a fixed enum.

```json
{
  "entities": [
    {
      "name": "Pipeline",
      "created_at": true,
      "updated_at": true,
      "scopeBy": "organizationId",
      "fields": [
        { "name": "name", "type": "text", "length": 100 },
        { "name": "entityType", "type": "text", "length": 50 }
      ]
    },
    {
      "name": "PipelineStage",
      "created_at": true,
      "updated_at": true,
      "fields": [
        { "name": "name", "type": "text", "length": 50 },
        { "name": "color", "type": "text", "length": 7, "nullable": true },
        { "name": "sortOrder", "type": "integer", "default": "0" },
        { "name": "isTerminal", "type": "boolean", "default": "false" },
        { "name": "isWon", "type": "boolean", "default": "false" }
      ],
      "indexes": [
        { "fields": ["pipelineId", "sortOrder"] }
      ]
    }
  ],
  "relationships": [
    { "from": "Organization", "to": "Pipeline", "type": "OneToMany" },
    { "from": "Pipeline", "to": "Organization", "type": "ManyToOne" },
    { "from": "Pipeline", "to": "PipelineStage", "type": "OneToMany" },
    { "from": "PipelineStage", "to": "Pipeline", "type": "ManyToOne" },
    { "from": "Deal", "to": "PipelineStage", "type": "ManyToOne", "to_name": "currentStage" }
  ]
}
```

**When to use:** CRM-style apps where each customer configures their own workflow. HubSpot, Pipedrive, Linear.

## Pattern 4: Approval Workflow

Multi-step approvals with sequential or parallel reviewers.

```json
{
  "entities": [
    {
      "name": "ApprovalRequest",
      "created_at": true,
      "updated_at": true,
      "scopeBy": "organizationId",
      "fields": [
        { "name": "entityType", "type": "text", "length": 50 },
        { "name": "entityId", "type": "text", "length": 50 },
        { "name": "status", "type": "enum", "values": ["pending", "approved", "rejected", "canceled"], "default": "pending" },
        { "name": "currentStep", "type": "integer", "default": "1" },
        { "name": "totalSteps", "type": "integer", "default": "1" }
      ]
    },
    {
      "name": "ApprovalStep",
      "created_at": true,
      "updated_at": true,
      "fields": [
        { "name": "stepNumber", "type": "integer" },
        { "name": "status", "type": "enum", "values": ["pending", "approved", "rejected", "skipped"], "default": "pending" },
        { "name": "decision", "type": "text", "nullable": true },
        { "name": "decidedAt", "type": "date", "nullable": true }
      ],
      "indexes": [
        { "fields": ["approvalRequestId", "stepNumber"] }
      ]
    }
  ],
  "relationships": [
    { "from": "ApprovalRequest", "to": "ApprovalStep", "type": "OneToMany" },
    { "from": "ApprovalStep", "to": "ApprovalRequest", "type": "ManyToOne" },
    { "from": "ApprovalRequest", "to": "User", "type": "ManyToOne", "to_name": "requester" },
    { "from": "ApprovalStep", "to": "User", "type": "ManyToOne", "to_name": "approver" }
  ]
}
```

**When to use:** Expense approvals, content publishing, access requests. Any process where multiple people must sign off in sequence.

## Choosing the Right Pattern

| Need | Pattern |
|------|---------|
| Fixed set of statuses | Simple Enum (Pattern 1) |
| Need to track time-in-stage | + Transition History (Pattern 2) |
| Users define their own stages | Custom Pipeline (Pattern 3) |
| Multi-step sign-off process | Approval Workflow (Pattern 4) |
