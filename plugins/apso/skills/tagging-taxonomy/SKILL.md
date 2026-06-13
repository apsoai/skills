---
name: tagging-taxonomy
description: Add tags, categories, and taxonomy entities to a schema. Flat tags, hierarchical categories, and faceted classification. Triggers on "add tags", "categories", "taxonomy", "labels", "tagging system", "classification".
---

# Tagging and Taxonomy Patterns

Add flexible classification to your entities. From simple tags to hierarchical taxonomies.

## Pattern 1: Flat Tags (Many-to-Many)

Free-form tags that can be applied to any entity. Users create tags on the fly.

```json
{
  "entities": [
    {
      "name": "Tag",
      "created_at": true,
      "scopeBy": "organizationId",
      "fields": [
        { "name": "name", "type": "text", "length": 50 },
        { "name": "color", "type": "text", "length": 7, "nullable": true },
        { "name": "slug", "type": "text", "length": 50 }
      ],
      "indexes": [
        { "fields": ["organizationId", "slug"], "unique": true }
      ]
    }
  ],
  "relationships": [
    { "from": "Organization", "to": "Tag", "type": "OneToMany" },
    { "from": "Tag", "to": "Organization", "type": "ManyToOne" },
    { "from": "Project", "to": "Tag", "type": "ManyToMany", "bi_directional": true },
    { "from": "Task", "to": "Tag", "type": "ManyToMany", "bi_directional": true }
  ]
}
```

**When to use:** GitHub labels, blog post tags, contact tags in a CRM. No hierarchy needed, users create tags freely.

## Pattern 2: Categorization (Single Category per Entity)

Each record belongs to exactly one category. Categories are predefined.

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
        { "name": "description", "type": "text", "nullable": true },
        { "name": "sortOrder", "type": "integer", "default": "0" },
        { "name": "isActive", "type": "boolean", "default": "true" }
      ],
      "indexes": [
        { "fields": ["organizationId", "slug"], "unique": true }
      ]
    }
  ],
  "relationships": [
    { "from": "Organization", "to": "Category", "type": "OneToMany" },
    { "from": "Category", "to": "Organization", "type": "ManyToOne" },
    { "from": "Product", "to": "Category", "type": "ManyToOne" },
    { "from": "Category", "to": "Product", "type": "OneToMany" }
  ]
}
```

**When to use:** Product categories, expense categories, content types. When each item belongs to exactly one group.

## Pattern 3: Hierarchical Categories

Categories with parent-child nesting. Combines the `hierarchical-data` pattern with categorization.

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
        { "name": "path", "type": "text", "length": 500, "nullable": true },
        { "name": "depth", "type": "integer", "default": "0" },
        { "name": "sortOrder", "type": "integer", "default": "0" }
      ],
      "indexes": [
        { "fields": ["organizationId", "slug"], "unique": true },
        { "fields": ["organizationId", "path"] }
      ]
    }
  ],
  "relationships": [
    { "from": "Category", "to": "Category", "type": "ManyToOne", "to_name": "parent", "nullable": true },
    { "from": "Category", "to": "Category", "type": "OneToMany", "to_name": "children" },
    { "from": "Organization", "to": "Category", "type": "OneToMany" },
    { "from": "Category", "to": "Organization", "type": "ManyToOne" }
  ]
}
```

**When to use:** E-commerce product categories (Electronics > Phones > iPhones), knowledge base sections, file folder trees.

## Pattern 4: Faceted Classification

Multiple independent classification dimensions. Each entity can be classified along several axes.

```json
{
  "entities": [
    {
      "name": "Facet",
      "created_at": true,
      "scopeBy": "organizationId",
      "fields": [
        { "name": "name", "type": "text", "length": 50 },
        { "name": "slug", "type": "text", "length": 50 },
        { "name": "allowMultiple", "type": "boolean", "default": "true" }
      ],
      "indexes": [
        { "fields": ["organizationId", "slug"], "unique": true }
      ]
    },
    {
      "name": "FacetValue",
      "created_at": true,
      "fields": [
        { "name": "value", "type": "text", "length": 100 },
        { "name": "slug", "type": "text", "length": 100 },
        { "name": "sortOrder", "type": "integer", "default": "0" }
      ],
      "indexes": [
        { "fields": ["facetId", "slug"], "unique": true }
      ]
    },
    {
      "name": "EntityFacetValue",
      "fields": [
        { "name": "entityType", "type": "text", "length": 50 },
        { "name": "entityId", "type": "text", "length": 50 }
      ],
      "indexes": [
        { "fields": ["entityType", "entityId", "facetValueId"], "unique": true }
      ]
    }
  ],
  "relationships": [
    { "from": "Facet", "to": "FacetValue", "type": "OneToMany" },
    { "from": "FacetValue", "to": "Facet", "type": "ManyToOne" },
    { "from": "FacetValue", "to": "EntityFacetValue", "type": "OneToMany" },
    { "from": "EntityFacetValue", "to": "FacetValue", "type": "ManyToOne" },
    { "from": "Organization", "to": "Facet", "type": "OneToMany" },
    { "from": "Facet", "to": "Organization", "type": "ManyToOne" }
  ]
}
```

Example facets for a product catalog:
- **Color:** Red, Blue, Green
- **Size:** Small, Medium, Large
- **Material:** Cotton, Polyester, Silk

**When to use:** E-commerce filters, job board search, property listings. Anywhere users need to filter by multiple independent dimensions.

## Choosing the Right Pattern

| Need | Pattern |
|------|---------|
| Free-form labels, user-created | Flat Tags (Pattern 1) |
| Fixed categories, one per item | Categories (Pattern 2) |
| Nested categories (tree) | Hierarchical (Pattern 3) |
| Multiple filter dimensions | Faceted (Pattern 4) |
