CREATE TABLE "price_refresh_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"wishlist_id" uuid,
	"status" text DEFAULT 'queued' NOT NULL,
	"total_items" integer DEFAULT 0 NOT NULL,
	"processed_items" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"finished_at" timestamp,
	"error_message" text,
	CONSTRAINT "status_check" CHECK (status IN ('queued', 'running', 'done', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "user_entitlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"is_premium" boolean DEFAULT false NOT NULL,
	"plan_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_entitlements_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD COLUMN "normalized_url" text;--> statement-breakpoint
ALTER TABLE "price_refresh_jobs" ADD CONSTRAINT "price_refresh_jobs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_refresh_jobs" ADD CONSTRAINT "price_refresh_jobs_wishlist_id_wishlists_id_fk" FOREIGN KEY ("wishlist_id") REFERENCES "public"."wishlists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_entitlements" ADD CONSTRAINT "user_entitlements_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "price_refresh_jobs_user_id_idx" ON "price_refresh_jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "price_refresh_jobs_status_idx" ON "price_refresh_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "user_entitlements_user_id_idx" ON "user_entitlements" USING btree ("user_id");