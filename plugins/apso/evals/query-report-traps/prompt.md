I'm adding a reporting endpoint to my Apso service (TypeScript, Postgres). It will run hand-written SQL with `this.projectRepo.query(sql, [organizationId])`, so `$1` is always the caller's organization id. Write the four queries below, each in its own file, exactly at these paths: the endpoint loads them from disk.

This is the database Apso generated (all ids are integers; every table has `created_at` and `updated_at`, `timestamp` columns holding UTC):

- `organization` (`id`, `name`)
- `"user"` (`id`, `name`, `email`, `"organizationId"`)
- `project` (`id`, `name`, `"organizationId"`)
- `task` (`id`, `title`, `status` enum `'todo' | 'in_progress' | 'done'`, `"projectId"`, `"assigneeId"` nullable, `"organizationId"`)
- `time_entry` (`id`, `hours` numeric, `"projectId"`, `"organizationId"`)
- `comment` (`id`, `body`, `"projectId"`, `"organizationId"`)

Open means any status except `done`.

1. `queries/project-open-tasks.sql`: every project in the organization with its number of open tasks. Columns `project_id`, `name`, `open_tasks`, ordered by project name.
2. `queries/idle-users.sql`: the organization's users who have no open task assigned to them. Columns `user_id`, `name`, ordered by name.
3. `queries/project-totals.sql`: for every project in the organization, the total hours logged and the number of comments. Columns `project_id`, `hours`, `comments`, ordered by `project_id`.
4. `queries/october-tasks.sql`: the organization's tasks created during October 2026 (UTC). Column `task_id`, ordered by creation time.
