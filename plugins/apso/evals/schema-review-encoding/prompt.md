Review this Apso schema before we deploy it. Is anything wrong or going to bite us? List concrete fixes.

```json
{
  "version": 2,
  "rootFolder": "src",
  "apiType": "Rest",
  "entities": [
    { "name": "Organization", "created_at": true, "updated_at": true, "primaryKeyType": "uuid",
      "fields": [ { "name": "name", "type": "text" } ] },
    { "name": "Employee", "created_at": true, "updated_at": true, "primaryKeyType": "uuid", "scopeBy": "organizationId",
      "fields": [ { "name": "fullName", "type": "text" }, { "name": "skillIds", "type": "array" } ] },
    { "name": "Skill", "created_at": true, "updated_at": true, "primaryKeyType": "uuid", "scopeBy": "organizationId",
      "fields": [ { "name": "name", "type": "text" } ] },
    { "name": "Expense", "created_at": true, "updated_at": true, "primaryKeyType": "uuid", "scopeBy": "organizationId",
      "fields": [
        { "name": "amount", "type": "float" },
        { "name": "description", "type": "varchar" },
        { "name": "submittedAt", "type": "date" },
        { "name": "status", "type": "enum", "values": ["draft", "submitted", "approved", "rejected"], "default": "draft" }
      ] },
    { "name": "Note", "created_at": true, "updated_at": true, "primaryKeyType": "uuid", "scopeBy": "organizationId",
      "fields": [ { "name": "body", "type": "text" }, { "name": "entityType", "type": "text" }, { "name": "entityId", "type": "text" } ] }
  ],
  "relationships": [
    { "from": "Employee", "to": "Organization", "type": "ManyToOne" },
    { "from": "Organization", "to": "Employee", "type": "OneToMany" },
    { "from": "Employee", "to": "Employee", "type": "ManyToOne", "to_name": "manager" },
    { "from": "Skill", "to": "Organization", "type": "ManyToOne" },
    { "from": "Expense", "to": "Organization", "type": "ManyToOne" },
    { "from": "Expense", "to": "Employee", "type": "ManyToOne", "to_name": "submittedBy" },
    { "from": "Note", "to": "Organization", "type": "ManyToOne" }
  ]
}
```
