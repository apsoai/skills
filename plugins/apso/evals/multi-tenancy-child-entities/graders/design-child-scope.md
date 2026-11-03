---
type: llm
---

Judge the schema and the response.
- Project, Task, Comment, and Reaction each scope by an organization column on the entity itself (a many-to-one relationship to Organization, or a tenant id field), not through a parent path such as `task.organizationId`.
- Organization itself is not scoped.
- The response tells the user why the child tables keep their own organization column despite the normalization request: scoping through a parent is not enforced on list requests or in Python and Go services.
Fail if any of these is missing.
