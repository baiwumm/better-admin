CREATE TABLE "depts" (
	"id" text PRIMARY KEY NOT NULL,
	"parent_id" text,
	"name" text NOT NULL,
	"code" text,
	"leader_id" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'enabled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" text PRIMARY KEY NOT NULL,
	"dept_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'management' NOT NULL,
	"rank" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'enabled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"post_id" text NOT NULL,
	"is_main" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_posts_user_post_unique" UNIQUE("user_id","post_id")
);
--> statement-breakpoint
CREATE TABLE "notice_read_records" (
	"id" text PRIMARY KEY NOT NULL,
	"notice_id" text NOT NULL,
	"user_id" text NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text DEFAULT '' NOT NULL,
	CONSTRAINT "notice_read_records_notice_user_unique" UNIQUE("notice_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "notice_remind_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"notice_id" text NOT NULL,
	"reminded_by" text NOT NULL,
	"reminded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notice_scopes" (
	"id" text PRIMARY KEY NOT NULL,
	"notice_id" text NOT NULL,
	"scope_type" text NOT NULL,
	"target_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notices" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"publisher_id" text,
	"is_top" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"publish_time" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"recipient_id" text NOT NULL,
	"type" text DEFAULT 'system' NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"link" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "dept_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "employee_no" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "employment_status" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "entry_date" date;--> statement-breakpoint
ALTER TABLE "depts" ADD CONSTRAINT "depts_parent_id_depts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."depts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "depts" ADD CONSTRAINT "depts_leader_id_users_id_fk" FOREIGN KEY ("leader_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_dept_id_depts_id_fk" FOREIGN KEY ("dept_id") REFERENCES "public"."depts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_posts" ADD CONSTRAINT "user_posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_posts" ADD CONSTRAINT "user_posts_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notice_read_records" ADD CONSTRAINT "notice_read_records_notice_id_notices_id_fk" FOREIGN KEY ("notice_id") REFERENCES "public"."notices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notice_read_records" ADD CONSTRAINT "notice_read_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notice_remind_logs" ADD CONSTRAINT "notice_remind_logs_notice_id_notices_id_fk" FOREIGN KEY ("notice_id") REFERENCES "public"."notices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notice_remind_logs" ADD CONSTRAINT "notice_remind_logs_reminded_by_users_id_fk" FOREIGN KEY ("reminded_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notice_scopes" ADD CONSTRAINT "notice_scopes_notice_id_notices_id_fk" FOREIGN KEY ("notice_id") REFERENCES "public"."notices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_publisher_id_users_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "depts_name_unique_active" ON "depts" USING btree ("name") WHERE "depts"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "depts_code_unique_active" ON "depts" USING btree ("code") WHERE "depts"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "depts_parent_idx" ON "depts" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "depts_leader_idx" ON "depts" USING btree ("leader_id");--> statement-breakpoint
CREATE UNIQUE INDEX "posts_dept_name_unique_active" ON "posts" USING btree ("dept_id","name") WHERE "posts"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "posts_dept_idx" ON "posts" USING btree ("dept_id");--> statement-breakpoint
CREATE INDEX "user_posts_user_idx" ON "user_posts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_posts_post_idx" ON "user_posts" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "notice_read_records_notice_idx" ON "notice_read_records" USING btree ("notice_id");--> statement-breakpoint
CREATE INDEX "notice_remind_logs_notice_idx" ON "notice_remind_logs" USING btree ("notice_id","reminded_at");--> statement-breakpoint
CREATE INDEX "notice_scopes_notice_idx" ON "notice_scopes" USING btree ("notice_id");--> statement-breakpoint
CREATE INDEX "notice_scopes_target_idx" ON "notice_scopes" USING btree ("scope_type","target_id");--> statement-breakpoint
CREATE INDEX "notices_publish_scan_idx" ON "notices" USING btree ("status","publish_time");--> statement-breakpoint
CREATE INDEX "notices_publisher_idx" ON "notices" USING btree ("publisher_id");--> statement-breakpoint
CREATE INDEX "notifications_recipient_idx" ON "notifications" USING btree ("recipient_id","read_at");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_dept_id_depts_id_fk" FOREIGN KEY ("dept_id") REFERENCES "public"."depts"("id") ON DELETE set null ON UPDATE no action;