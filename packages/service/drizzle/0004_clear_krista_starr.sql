CREATE TABLE IF NOT EXISTS "file_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" uuid NOT NULL,
	"token" text NOT NULL,
	"is_password_protected" boolean DEFAULT false NOT NULL,
	"password" text,
	"expires_at" timestamp,
	"view_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "file_shares_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "skills" ADD COLUMN "private_deployed_at" timestamp;--> statement-breakpoint
ALTER TABLE "skills" ADD COLUMN "public_deployed_at" timestamp;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "file_shares" ADD CONSTRAINT "file_shares_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "file_shares" ADD CONSTRAINT "file_shares_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
