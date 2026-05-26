---
name: hierarchical-data
description: Model tree structures and hierarchies in a schema. Covers parent-child relationships, categories, org charts, nested comments, and folder structures. Triggers on "tree structure", "parent child", "nested categories", "hierarchy", "folder structure", "org chart".
---

# Hierarchical Data Patterns

Model tree structures like categories, folders, org charts, nested comments, and threaded discussions.

## Pattern 1: Adjacency List (Most Common)

Each record points to its parent via a self-referencing relationship.

```json
{
  "entities": [
    {
      "name": "Category",
      "created_at": true,
      "updated_at": true,
      "scopeBy": "organizationId",
      "fields": [
        { "name": "name", "type": "text", "length": 100 },
        { "name": "slug", "type": "text", "length": 100 },
        { "name": "depth", "type": "integer", "default": "0" },
        { "name": "sortOrder", "type": "integer", "default": "0" }
      ],
      "indexes": [
        { "fields": ["organizationId", "parentId"] },
        { "fields": ["organizationId", "slug"], "unique": true }
      ]
    }
  ],
  "relationships": [
    { "from": "Category", "to": "Category", "type": "ManyToOne", "to_name": "parent", "nullable": true },
    { "from": "Category", "to": "Category", "type": "OneToMany", "to_name": "children" }
  ]
}
```

**Reads:** Fetching direct children is fast (WHERE parentId = X). Fetching the full tree requires recursive queries or multiple round trips.

**Writes:** Moving a node means updating one row (change parentId).

**When to use:** Shallow trees (2-5 levels), frequent writes, infrequent full-tree reads. Categories, folders, org charts.

## Pattern 2: Materialized Path

Store the full path from root to node as a string.

```json
{
  "name": "Folder",
  "created_at": true,
  "updated_at": true,
  "scopeBy": "organizationId",
  "fields": [
    { "name": "name", "type": "text", "length": 100 },
    { "name": "path", "type": "text", "length": 1000 },
    { "name": "depth", "type": "integer", "default": "0" }
  ],
  "indexes": [
    { "fields": ["organizationId", "path"] }
  ]
}
```

The `path` field stores something like `/1/5/12/` where each number is an ancestor's ID.

**Reads:** Finding all descendants is a LIKE query: `WHERE path LIKE '/1/5/%'`. Finding ancestors: split the path string.

**Writes:** Moving a subtree means updating the path of every descendant.

**When to use:** Read-heavy trees where you frequently need "all descendants" queries. File systems, taxonomies.

## Pattern 3: Nested Comments / Threaded Discussions

Comments that can reply to other comments, with a depth limit.

```json
{
  "entities": [
    {
      "name": "Comment",
      "created_at": true,
      "updated_at": true,
      "scopeBy": "organizationId",
      "fields": [
        { "name": "body", "type": "text" },
        { "name": "depth", "type": "integer", "default": "0" },
        { "name": "path", "type": "text", "length": 500, "nullable": true },
        { "name": "isDeleted", "type": "boolean", "default": "false" }
      ],
      "indexes": [
        { "fields": ["taskId", "path"] },
        { "fields": ["taskId", "created_at"] }
      ]
    }
  ],
  "relationships": [
    { "from": "Comment", "to": "Comment", "type": "ManyToOne", "to_name": "parent", "nullable": true },
    { "from": "Comment", "to": "User", "type": "ManyToOne", "to_name": "author" },
    { "from": "Comment", "to": "Task", "type": "ManyToOne" },
    { "from": "Task", "to": "Comment", "type": "OneToMany" }
  ]
}
```

Uses both adjacency list (parentId for direct replies) and materialized path (for rendering the full thread).

**When to use:** Reddit-style threaded comments, discussion forums, PR review comments.

## Pattern 4: Flat with Sort Order

Not a true tree, but a flat list with manual ordering. Useful for simple drag-and-drop reordering.

```json
{
  "name": "MenuItem",
  "created_at": true,
  "updated_at": true,
  "scopeBy": "organizationId",
  "fields": [
    { "name": "label", "type": "text", "length": 100 },
    { "name": "url", "type": "text", "length": 500, "nullable": true },
    { "name": "group", "type": "text", "length": 50, "nullable": true },
    { "name": "sortOrder", "type": "integer", "default": "0" }
  ],
  "indexes": [
    { "fields": ["organizationId", "group", "sortOrder"] }
  ]
}
```

**When to use:** Menus, kanban board columns, priority lists. Anything where order matters but nesting doesn't go deeper than one level.

## Choosing the Right Pattern

| Structure | Pattern | Read Speed | Write Speed |
|-----------|---------|-----------|------------|
| Shallow tree (2-5 levels) | Adjacency List | Fast for direct children | Fast (one row update) |
| Deep tree, read-heavy | Materialized Path | Fast for subtree queries | Slow (update all descendants) |
| Threaded comments | Adjacency + Path hybrid | Fast for rendering | Fast (one row insert) |
| Flat ordered list | Sort Order | Fast | Medium (reorder siblings) |

## Self-Referencing Relationship

The key to all tree patterns is the self-referencing relationship:

```json
{
  "from": "Category",
  "to": "Category",
  "type": "ManyToOne",
  "to_name": "parent",
  "nullable": true
}
```

`nullable: true` is required because root nodes have no parent. `to_name` is required because both sides reference the same entity.
