ALTER TABLE "user_settings" ADD COLUMN "language_mode" text DEFAULT 'system' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "language_code" text DEFAULT 'en' NOT NULL;