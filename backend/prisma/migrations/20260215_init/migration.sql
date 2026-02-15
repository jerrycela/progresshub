-- CreateEnum
CREATE TYPE "TimeEntryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PermissionLevel" AS ENUM ('EMPLOYEE', 'PM', 'PRODUCER', 'MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'PAUSED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('UNCLAIMED', 'CLAIMED', 'IN_PROGRESS', 'PAUSED', 'DONE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'ACHIEVED');

-- CreateEnum
CREATE TYPE "GitLabActivityType" AS ENUM ('COMMIT', 'MR_OPENED', 'MR_MERGED', 'MR_CLOSED', 'MR_COMMENT', 'MR_APPROVED', 'ISSUE_CREATED', 'ISSUE_CLOSED', 'ISSUE_UPDATED');

-- CreateEnum
CREATE TYPE "SyncDirection" AS ENUM ('GITLAB_TO_TASK', 'TASK_TO_GITLAB', 'BIDIRECTIONAL');

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "slack_user_id" TEXT,
    "department" TEXT,
    "permission_level" "PermissionLevel" NOT NULL DEFAULT 'EMPLOYEE',
    "managed_projects" TEXT[],
    "hourly_rate" DECIMAL(10,2),
    "avatar_url" TEXT,
    "function_type" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_active_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "assigned_to" TEXT,
    "creator_id" TEXT,
    "collaborators" TEXT[],
    "planned_start_date" TIMESTAMP(3),
    "planned_end_date" TIMESTAMP(3),
    "actual_start_date" TIMESTAMP(3),
    "actual_end_date" TIMESTAMP(3),
    "progress_percentage" INTEGER NOT NULL DEFAULT 0,
    "status" "TaskStatus" NOT NULL DEFAULT 'UNCLAIMED',
    "priority" TEXT DEFAULT 'MEDIUM',
    "function_tags" TEXT[],
    "estimated_hours" DECIMAL(6,2),
    "actual_hours" DECIMAL(6,2),
    "blocker_reason" TEXT,
    "pause_reason" TEXT,
    "pause_note" TEXT,
    "paused_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "dependencies" TEXT[],
    "milestone_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "target_date" TIMESTAMP(3) NOT NULL,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "color" TEXT DEFAULT '#3B82F6',
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progress_logs" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "progress_percentage" INTEGER NOT NULL,
    "report_type" TEXT NOT NULL DEFAULT 'PROGRESS',
    "progress_delta" INTEGER,
    "notes" TEXT,
    "blocker_reason" TEXT,
    "reported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "progress_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_notes" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "author_id" TEXT,
    "author_name" TEXT NOT NULL,
    "author_role" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_entries" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "task_id" TEXT,
    "category_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "hours" DECIMAL(4,2) NOT NULL,
    "description" TEXT,
    "status" "TimeEntryStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejected_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_estimates" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "estimated_hours" DECIMAL(6,2) NOT NULL,
    "estimated_by" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_estimates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gitlab_instances" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "base_url" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "client_secret" TEXT NOT NULL,
    "webhook_secret" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gitlab_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gitlab_connections" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "instance_id" TEXT NOT NULL,
    "gitlab_user_id" INTEGER NOT NULL,
    "gitlab_username" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "auto_convert_time" BOOLEAN NOT NULL DEFAULT false,
    "sync_commits" BOOLEAN NOT NULL DEFAULT true,
    "sync_mrs" BOOLEAN NOT NULL DEFAULT true,
    "sync_issues" BOOLEAN NOT NULL DEFAULT true,
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_sync_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "gitlab_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gitlab_activities" (
    "id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "activity_type" "GitLabActivityType" NOT NULL,
    "gitlab_event_id" TEXT NOT NULL,
    "project_path" TEXT NOT NULL,
    "commit_sha" TEXT,
    "commit_message" TEXT,
    "additions" INTEGER DEFAULT 0,
    "deletions" INTEGER DEFAULT 0,
    "mr_iid" INTEGER,
    "mr_title" TEXT,
    "mr_state" TEXT,
    "issue_iid" INTEGER,
    "issue_title" TEXT,
    "activity_at" TIMESTAMP(3) NOT NULL,
    "task_id" TEXT,
    "time_entry_id" TEXT,
    "suggested_hours" DECIMAL(4,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gitlab_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gitlab_issue_mappings" (
    "id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "gitlab_issue_id" INTEGER NOT NULL,
    "gitlab_issue_iid" INTEGER NOT NULL,
    "project_path" TEXT NOT NULL,
    "issue_url" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "sync_direction" "SyncDirection" NOT NULL DEFAULT 'BIDIRECTIONAL',
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gitlab_issue_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");

-- CreateIndex
CREATE UNIQUE INDEX "employees_slack_user_id_key" ON "employees"("slack_user_id");

-- CreateIndex
CREATE INDEX "tasks_project_id_idx" ON "tasks"("project_id");

-- CreateIndex
CREATE INDEX "tasks_assigned_to_idx" ON "tasks"("assigned_to");

-- CreateIndex
CREATE INDEX "tasks_creator_id_idx" ON "tasks"("creator_id");

-- CreateIndex
CREATE INDEX "tasks_milestone_id_idx" ON "tasks"("milestone_id");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "milestones_project_id_idx" ON "milestones"("project_id");

-- CreateIndex
CREATE INDEX "progress_logs_task_id_idx" ON "progress_logs"("task_id");

-- CreateIndex
CREATE INDEX "progress_logs_employee_id_idx" ON "progress_logs"("employee_id");

-- CreateIndex
CREATE INDEX "progress_logs_reported_at_idx" ON "progress_logs"("reported_at");

-- CreateIndex
CREATE INDEX "task_notes_task_id_idx" ON "task_notes"("task_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_employee_id_key" ON "user_settings"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "time_categories_name_key" ON "time_categories"("name");

-- CreateIndex
CREATE INDEX "time_entries_employee_id_idx" ON "time_entries"("employee_id");

-- CreateIndex
CREATE INDEX "time_entries_project_id_idx" ON "time_entries"("project_id");

-- CreateIndex
CREATE INDEX "time_entries_task_id_idx" ON "time_entries"("task_id");

-- CreateIndex
CREATE INDEX "time_entries_category_id_idx" ON "time_entries"("category_id");

-- CreateIndex
CREATE INDEX "time_entries_date_idx" ON "time_entries"("date");

-- CreateIndex
CREATE INDEX "time_entries_status_idx" ON "time_entries"("status");

-- CreateIndex
CREATE UNIQUE INDEX "time_estimates_task_id_key" ON "time_estimates"("task_id");

-- CreateIndex
CREATE UNIQUE INDEX "gitlab_instances_base_url_key" ON "gitlab_instances"("base_url");

-- CreateIndex
CREATE INDEX "gitlab_connections_employee_id_idx" ON "gitlab_connections"("employee_id");

-- CreateIndex
CREATE INDEX "gitlab_connections_instance_id_idx" ON "gitlab_connections"("instance_id");

-- CreateIndex
CREATE UNIQUE INDEX "gitlab_connections_employee_id_instance_id_key" ON "gitlab_connections"("employee_id", "instance_id");

-- CreateIndex
CREATE UNIQUE INDEX "gitlab_activities_gitlab_event_id_key" ON "gitlab_activities"("gitlab_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "gitlab_activities_time_entry_id_key" ON "gitlab_activities"("time_entry_id");

-- CreateIndex
CREATE INDEX "gitlab_activities_connection_id_activity_at_idx" ON "gitlab_activities"("connection_id", "activity_at");

-- CreateIndex
CREATE INDEX "gitlab_activities_task_id_idx" ON "gitlab_activities"("task_id");

-- CreateIndex
CREATE INDEX "gitlab_activities_project_path_idx" ON "gitlab_activities"("project_path");

-- CreateIndex
CREATE UNIQUE INDEX "gitlab_issue_mappings_task_id_key" ON "gitlab_issue_mappings"("task_id");

-- CreateIndex
CREATE INDEX "gitlab_issue_mappings_task_id_idx" ON "gitlab_issue_mappings"("task_id");

-- CreateIndex
CREATE UNIQUE INDEX "gitlab_issue_mappings_connection_id_gitlab_issue_id_key" ON "gitlab_issue_mappings"("connection_id", "gitlab_issue_id");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_logs" ADD CONSTRAINT "progress_logs_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_logs" ADD CONSTRAINT "progress_logs_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_notes" ADD CONSTRAINT "task_notes_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_notes" ADD CONSTRAINT "task_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "time_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_estimates" ADD CONSTRAINT "time_estimates_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_estimates" ADD CONSTRAINT "time_estimates_estimated_by_fkey" FOREIGN KEY ("estimated_by") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gitlab_connections" ADD CONSTRAINT "gitlab_connections_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gitlab_connections" ADD CONSTRAINT "gitlab_connections_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "gitlab_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gitlab_activities" ADD CONSTRAINT "gitlab_activities_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "gitlab_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gitlab_activities" ADD CONSTRAINT "gitlab_activities_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gitlab_activities" ADD CONSTRAINT "gitlab_activities_time_entry_id_fkey" FOREIGN KEY ("time_entry_id") REFERENCES "time_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gitlab_issue_mappings" ADD CONSTRAINT "gitlab_issue_mappings_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "gitlab_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gitlab_issue_mappings" ADD CONSTRAINT "gitlab_issue_mappings_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
