ALTER TABLE "user_reports" ADD COLUMN "admin_reply" text;--> statement-breakpoint
ALTER TABLE "user_reports" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD COLUMN "alert_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD COLUMN "alert_price" numeric(10, 2);