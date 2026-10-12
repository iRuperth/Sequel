CREATE TYPE "public"."column_type_hint" AS ENUM('text', 'integer', 'decimal', 'boolean', 'date', 'timestamp', 'json');
CREATE TYPE "public"."difficulty" AS ENUM('beginner', 'intermediate', 'advanced', 'expert');
CREATE TYPE "public"."execution_mode" AS ENUM('read', 'scratch', 'explain', 'grade');
CREATE TYPE "public"."execution_source" AS ENUM('workbench', 'task', 'scheduled', 'dashboard', 'quality');
CREATE TYPE "public"."execution_status" AS ENUM('succeeded', 'failed', 'cancelled', 'timed_out', 'rejected');
CREATE TYPE "public"."feedback_status" AS ENUM('none', 'queued', 'ready', 'failed');
CREATE TYPE "public"."job_kind" AS ENUM('task_generate', 'task_grade', 'submission_feedback', 'scheduled_query', 'quality_check', 'catalog_refresh', 'scratch_sweep');
CREATE TYPE "public"."job_status" AS ENUM('queued', 'running', 'succeeded', 'failed');
CREATE TYPE "public"."link_kind" AS ENUM('foreign_key', 'logical');
CREATE TYPE "public"."quality_check_kind" AS ENUM('not_null', 'unique', 'row_count_between', 'freshness', 'accepted_values', 'custom_sql');
CREATE TYPE "public"."quality_run_status" AS ENUM('pass', 'fail', 'error');
CREATE TYPE "public"."rejection_reason" AS ENUM('empty_query', 'syntax_error', 'multiple_statements', 'too_many_statements', 'statement_not_allowed', 'function_not_allowed', 'schema_not_allowed', 'data_modifying_cte', 'scratch_session_required');
CREATE TYPE "public"."relation_kind" AS ENUM('table', 'view', 'materialized_view', 'foreign_table');
CREATE TYPE "public"."run_status" AS ENUM('running', 'succeeded', 'failed');
CREATE TYPE "public"."sandbox_session_status" AS ENUM('active', 'expired', 'dropped');
CREATE TYPE "public"."severity" AS ENUM('low', 'medium', 'high', 'critical');
CREATE TYPE "public"."submission_status" AS ENUM('pending', 'graded');
CREATE TYPE "public"."task_mode" AS ENUM('read', 'scratch');
CREATE TYPE "public"."task_source" AS ENUM('starter', 'generated');
CREATE TYPE "public"."task_status" AS ENUM('generating', 'open', 'in_progress', 'solved', 'abandoned', 'failed_generation');
CREATE TYPE "public"."topic" AS ENUM('select_basics', 'filtering', 'sorting_limiting', 'aggregation', 'joins', 'subqueries', 'ctes', 'window_functions', 'date_time', 'string_functions', 'conditional_logic', 'set_operations', 'null_handling', 'data_modelling_ddl', 'dml', 'query_optimisation', 'data_quality', 'analytics_patterns');
CREATE TYPE "public"."track" AS ENUM('data_analyst', 'data_engineer', 'data_scientist');
CREATE TYPE "public"."verdict" AS ENUM('pass', 'fail', 'error', 'rejected');
CREATE TYPE "public"."widget_kind" AS ENUM('kpi', 'line', 'bar', 'area', 'table');
CREATE SEQUENCE "public"."task_ticket_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1000 CACHE 1;
CREATE TABLE "catalog_columns" (
	"schema_name" text NOT NULL,
	"table_name" text NOT NULL,
	"column_name" text NOT NULL,
	"ordinal" integer NOT NULL,
	"data_type" text NOT NULL,
	"is_nullable" boolean NOT NULL,
	"is_primary_key" boolean DEFAULT false NOT NULL,
	"description" text NOT NULL,
	"is_pii" boolean DEFAULT false NOT NULL,
	"example_values" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"null_fraction" real,
	"distinct_count" real,
	CONSTRAINT "catalog_columns_schema_name_table_name_column_name_pk" PRIMARY KEY("schema_name","table_name","column_name")
);

CREATE TABLE "catalog_datasets" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"domain" text NOT NULL,
	"description" text NOT NULL,
	"owner_team" text NOT NULL,
	"display_order" integer NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL
);

CREATE TABLE "catalog_links" (
	"from_schema" text NOT NULL,
	"from_table" text NOT NULL,
	"from_column" text NOT NULL,
	"to_schema" text NOT NULL,
	"to_table" text NOT NULL,
	"to_column" text NOT NULL,
	"kind" "link_kind" NOT NULL,
	CONSTRAINT "catalog_links_from_schema_from_table_from_column_to_schema_to_table_pk" PRIMARY KEY("from_schema","from_table","from_column","to_schema","to_table")
);

CREATE TABLE "catalog_tables" (
	"schema_name" text NOT NULL,
	"table_name" text NOT NULL,
	"dataset_slug" text NOT NULL,
	"kind" "relation_kind" DEFAULT 'table' NOT NULL,
	"description" text NOT NULL,
	"grain" text,
	"owner_team" text NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"row_count" bigint,
	"sample_columns" jsonb,
	"sample_rows" jsonb,
	"refreshed_at" timestamp (3) with time zone,
	CONSTRAINT "catalog_tables_schema_name_table_name_pk" PRIMARY KEY("schema_name","table_name")
);

CREATE TABLE "user_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"editor_font_size" integer NOT NULL,
	"editor_tab_size" integer NOT NULL,
	"editor_word_wrap" boolean NOT NULL,
	"editor_line_numbers" boolean NOT NULL,
	"editor_autocomplete" boolean NOT NULL,
	"result_page_size" integer NOT NULL,
	"default_track" "track" NOT NULL,
	"llm_feedback_enabled" boolean NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"handle" text NOT NULL,
	"display_name" text NOT NULL,
	"role_title" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_handle_unique" UNIQUE("handle")
);

CREATE TABLE "catalog_refreshes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"started_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp (3) with time zone,
	"table_count" integer DEFAULT 0 NOT NULL,
	"notes" text
);

CREATE TABLE "daily_activity" (
	"user_id" uuid NOT NULL,
	"day" date NOT NULL,
	"queries_run" integer DEFAULT 0 NOT NULL,
	"tasks_attempted" integer DEFAULT 0 NOT NULL,
	"tasks_solved" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "daily_activity_user_id_day_pk" PRIMARY KEY("user_id","day")
);

CREATE TABLE "dashboard_widgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dashboard_id" uuid NOT NULL,
	"saved_query_id" uuid NOT NULL,
	"title" text NOT NULL,
	"kind" "widget_kind" NOT NULL,
	"config" jsonb NOT NULL,
	"position" jsonb NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "dashboards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"seed_key" text,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"kind" "job_kind" NOT NULL,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"stage" text,
	"subject_id" text,
	"error" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp (3) with time zone,
	"finished_at" timestamp (3) with time zone
);

CREATE TABLE "quality_check_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quality_check_id" uuid NOT NULL,
	"execution_id" uuid,
	"status" "quality_run_status" NOT NULL,
	"observed_value" text,
	"message" text NOT NULL,
	"duration_ms" integer,
	"ran_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "quality_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"seed_key" text,
	"kind" "quality_check_kind" NOT NULL,
	"target_schema" text NOT NULL,
	"target_table" text NOT NULL,
	"target_column" text,
	"config" jsonb NOT NULL,
	"severity" "severity" NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"cron_expression" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quality_checks_seedKey_unique" UNIQUE("seed_key")
);

CREATE TABLE "scheduled_queries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"saved_query_id" uuid NOT NULL,
	"name" text NOT NULL,
	"cron_expression" text NOT NULL,
	"timezone" text NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp (3) with time zone,
	"next_run_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "scheduled_query_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scheduled_query_id" uuid NOT NULL,
	"execution_id" uuid,
	"status" "run_status" NOT NULL,
	"row_count" integer,
	"duration_ms" integer,
	"error" text,
	"started_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp (3) with time zone
);

CREATE TABLE "task_hints" (
	"task_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"body" text NOT NULL,
	"revealed_at" timestamp (3) with time zone,
	CONSTRAINT "task_hints_task_id_position_pk" PRIMARY KEY("task_id","position")
);

CREATE TABLE "task_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"sql_text" text NOT NULL,
	"status" "submission_status" DEFAULT 'pending' NOT NULL,
	"verdict" "verdict",
	"comparison" jsonb,
	"error" jsonb,
	"duration_ms" integer,
	"execution_id" uuid,
	"job_id" text,
	"feedback_status" "feedback_status" DEFAULT 'none' NOT NULL,
	"feedback" jsonb,
	"submitted_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"graded_at" timestamp (3) with time zone
);

CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"ticket_number" integer DEFAULT nextval('task_ticket_seq') NOT NULL,
	"source" "task_source" NOT NULL,
	"starter_key" text,
	"status" "task_status" NOT NULL,
	"track" "track" NOT NULL,
	"difficulty" "difficulty" NOT NULL,
	"topics" "topic"[] DEFAULT '{}' NOT NULL,
	"dataset_slugs" text[] DEFAULT '{}'::text[] NOT NULL,
	"mode" "task_mode" DEFAULT 'read' NOT NULL,
	"title" text NOT NULL,
	"stakeholder" jsonb,
	"business_context" text DEFAULT '' NOT NULL,
	"requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"acceptance_criteria" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expected_columns" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"order_matters" boolean DEFAULT false NOT NULL,
	"reference_sql" text,
	"verification_sql" text,
	"reference_signature" jsonb,
	"explanation" text,
	"estimated_minutes" integer,
	"draft_sql" text,
	"generation_job_id" text,
	"generation_error" text,
	"llm_model" text,
	"llm_usage" jsonb,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"solved_at" timestamp (3) with time zone,
	CONSTRAINT "tasks_ticketNumber_unique" UNIQUE("ticket_number")
);

CREATE TABLE "user_topic_skills" (
	"user_id" uuid NOT NULL,
	"topic" "topic" NOT NULL,
	"level" real NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"passes" integer DEFAULT 0 NOT NULL,
	"last_practiced_at" timestamp (3) with time zone,
	CONSTRAINT "user_topic_skills_user_id_topic_pk" PRIMARY KEY("user_id","topic")
);

CREATE TABLE "query_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sql_text" text NOT NULL,
	"mode" "execution_mode" NOT NULL,
	"status" "execution_status" NOT NULL,
	"source" "execution_source" NOT NULL,
	"rejection_reason" "rejection_reason",
	"error_message" text,
	"error_detail" text,
	"error_position" integer,
	"sql_state" text,
	"duration_ms" integer NOT NULL,
	"row_count" integer,
	"rows_truncated" boolean DEFAULT false NOT NULL,
	"statement_count" integer DEFAULT 1 NOT NULL,
	"columns" jsonb,
	"task_id" uuid,
	"sandbox_session_id" uuid,
	"executed_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "sandbox_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"schema_name" text NOT NULL,
	"status" "sandbox_session_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp (3) with time zone NOT NULL,
	CONSTRAINT "sandbox_sessions_schemaName_unique" UNIQUE("schema_name")
);

CREATE TABLE "saved_queries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"seed_key" text,
	"name" text NOT NULL,
	"description" text,
	"sql_text" text NOT NULL,
	"dataset_slug" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"last_run_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "catalog_tables" ADD CONSTRAINT "catalog_tables_dataset_slug_catalog_datasets_slug_fk" FOREIGN KEY ("dataset_slug") REFERENCES "public"."catalog_datasets"("slug") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "daily_activity" ADD CONSTRAINT "daily_activity_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_dashboard_id_dashboards_id_fk" FOREIGN KEY ("dashboard_id") REFERENCES "public"."dashboards"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_saved_query_id_saved_queries_id_fk" FOREIGN KEY ("saved_query_id") REFERENCES "public"."saved_queries"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "dashboards" ADD CONSTRAINT "dashboards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "quality_check_runs" ADD CONSTRAINT "quality_check_runs_quality_check_id_quality_checks_id_fk" FOREIGN KEY ("quality_check_id") REFERENCES "public"."quality_checks"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "quality_check_runs" ADD CONSTRAINT "quality_check_runs_execution_id_query_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."query_executions"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "quality_checks" ADD CONSTRAINT "quality_checks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "scheduled_queries" ADD CONSTRAINT "scheduled_queries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "scheduled_queries" ADD CONSTRAINT "scheduled_queries_saved_query_id_saved_queries_id_fk" FOREIGN KEY ("saved_query_id") REFERENCES "public"."saved_queries"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "scheduled_query_runs" ADD CONSTRAINT "scheduled_query_runs_scheduled_query_id_scheduled_queries_id_fk" FOREIGN KEY ("scheduled_query_id") REFERENCES "public"."scheduled_queries"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "scheduled_query_runs" ADD CONSTRAINT "scheduled_query_runs_execution_id_query_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."query_executions"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "task_hints" ADD CONSTRAINT "task_hints_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_execution_id_query_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."query_executions"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_topic_skills" ADD CONSTRAINT "user_topic_skills_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "query_executions" ADD CONSTRAINT "query_executions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "query_executions" ADD CONSTRAINT "query_executions_sandbox_session_id_sandbox_sessions_id_fk" FOREIGN KEY ("sandbox_session_id") REFERENCES "public"."sandbox_sessions"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "sandbox_sessions" ADD CONSTRAINT "sandbox_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "saved_queries" ADD CONSTRAINT "saved_queries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "dashboard_widgets_dashboard_id_index" ON "dashboard_widgets" USING btree ("dashboard_id");
CREATE UNIQUE INDEX "dashboards_user_id_seed_key_index" ON "dashboards" USING btree ("user_id","seed_key");
CREATE INDEX "jobs_kind_created_at_index" ON "jobs" USING btree ("kind","created_at");
CREATE INDEX "jobs_status_index" ON "jobs" USING btree ("status");
CREATE INDEX "quality_check_runs_quality_check_id_ran_at_index" ON "quality_check_runs" USING btree ("quality_check_id","ran_at");
CREATE INDEX "scheduled_query_runs_scheduled_query_id_started_at_index" ON "scheduled_query_runs" USING btree ("scheduled_query_id","started_at");
CREATE INDEX "task_submissions_task_id_submitted_at_index" ON "task_submissions" USING btree ("task_id","submitted_at");
CREATE INDEX "tasks_user_id_status_index" ON "tasks" USING btree ("user_id","status");
CREATE INDEX "tasks_user_id_created_at_index" ON "tasks" USING btree ("user_id","created_at");
CREATE UNIQUE INDEX "tasks_user_id_starter_key_index" ON "tasks" USING btree ("user_id","starter_key");
CREATE INDEX "query_executions_user_id_executed_at_index" ON "query_executions" USING btree ("user_id","executed_at");
CREATE INDEX "query_executions_status_index" ON "query_executions" USING btree ("status");
CREATE INDEX "query_executions_source_index" ON "query_executions" USING btree ("source");
CREATE INDEX "sandbox_sessions_user_id_status_index" ON "sandbox_sessions" USING btree ("user_id","status");
CREATE INDEX "saved_queries_user_id_updated_at_index" ON "saved_queries" USING btree ("user_id","updated_at");
CREATE UNIQUE INDEX "saved_queries_user_id_seed_key_index" ON "saved_queries" USING btree ("user_id","seed_key");