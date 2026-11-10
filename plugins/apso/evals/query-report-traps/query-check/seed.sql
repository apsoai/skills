-- Organization 1 is the caller ($1 = 1). Organization 2 must never show up.
INSERT INTO organization (id, name) VALUES (1, 'Acme'), (2, 'Rival');
INSERT INTO "user" (id, name, email, "organizationId") VALUES
  (1, 'Ana', 'ana@acme.test', 1), (2, 'Ben', 'ben@acme.test', 1),
  (3, 'Cy', 'cy@acme.test', 1), (4, 'Dee', 'dee@rival.test', 2);
-- Cosmos has nothing; Borealis has only finished work.
INSERT INTO project (id, name, "organizationId") VALUES
  (1, 'Apollo', 1), (2, 'Borealis', 1), (3, 'Cosmos', 1), (4, 'Zeta', 2);
-- Task 3 is open and unassigned, so "assigneeId" holds a NULL.
INSERT INTO task (id, title, status, "projectId", "assigneeId", "organizationId", created_at) VALUES
  (1, 'Launch plan', 'todo', 1, 1, 1, '2026-10-05 09:00'),
  (2, 'Budget', 'done', 1, 2, 1, '2026-10-31 18:00'),
  (3, 'Hiring', 'in_progress', 1, NULL, 1, '2026-11-01 00:00'),
  (4, 'Research', 'done', 2, 3, 1, '2026-09-30 23:59'),
  (5, 'Rival task', 'todo', 4, 4, 2, '2026-10-10 12:00');
-- Apollo has two time entries and three comments: joining both at once multiplies them.
INSERT INTO time_entry (id, hours, "projectId", "organizationId") VALUES
  (1, 3.00, 1, 1), (2, 5.00, 1, 1), (3, 1.50, 2, 1), (4, 10.00, 4, 2);
INSERT INTO comment (id, body, "projectId", "organizationId") VALUES
  (1, 'Kickoff', 1, 1), (2, 'Update', 1, 1), (3, 'Risks', 1, 1), (4, 'Rival note', 4, 2);
