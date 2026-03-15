-- GIN indexes for array columns used by has() filters
CREATE INDEX IF NOT EXISTS "tasks_function_tags_gin" ON "tasks" USING GIN ("function_tags");
CREATE INDEX IF NOT EXISTS "tasks_collaborators_gin" ON "tasks" USING GIN ("collaborators");

-- Composite index for pool tasks query (project + created_at sort)
CREATE INDEX IF NOT EXISTS "tasks_project_id_created_at_idx" ON "tasks" ("project_id", "created_at" DESC);

-- Composite index for employee tasks query (assignee + due date sort)
CREATE INDEX IF NOT EXISTS "tasks_assigned_to_planned_end_idx" ON "tasks" ("assigned_to_id", "planned_end_date");

-- Partial index for overdue count query
CREATE INDEX IF NOT EXISTS "tasks_overdue_idx" ON "tasks" ("planned_end_date") WHERE "status" != 'DONE';
