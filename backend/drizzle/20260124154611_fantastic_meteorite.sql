CREATE TABLE "import_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"mode" text NOT NULL,
	"grouping_mode" text NOT NULL,
	"default_wishlist_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mode_check" CHECK (mode IN ('merge', 'new', 'split')),
	CONSTRAINT "grouping_mode_check" CHECK (grouping_mode IN ('store', 'category', 'price', 'person', 'occasion'))
);
--> statement-breakpoint
CREATE TABLE "item_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shared_wishlist_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"reserved_by_name" text NOT NULL,
	"reserved_at" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'reserved' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "status_check" CHECK (status IN ('reserved', 'released'))
);
--> statement-breakpoint
CREATE TABLE "notification_dedupe" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"item_id" uuid NOT NULL,
	"type" text NOT NULL,
	"last_sent_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "type_check" CHECK (type IN ('price_drop', 'under_target', 'weekly_digest'))
);
--> statement-breakpoint
ALTER TABLE "shared_wishlists" ADD COLUMN "allow_reservations" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "shared_wishlists" ADD COLUMN "hide_reserved_items" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "shared_wishlists" ADD COLUMN "show_reserver_names" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "quiet_hours_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "quiet_hours_start_time" text;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "quiet_hours_end_time" text;--> statement-breakpoint
ALTER TABLE "import_templates" ADD CONSTRAINT "import_templates_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_templates" ADD CONSTRAINT "import_templates_default_wishlist_id_wishlists_id_fk" FOREIGN KEY ("default_wishlist_id") REFERENCES "public"."wishlists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_reservations" ADD CONSTRAINT "item_reservations_shared_wishlist_id_shared_wishlists_id_fk" FOREIGN KEY ("shared_wishlist_id") REFERENCES "public"."shared_wishlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_reservations" ADD CONSTRAINT "item_reservations_item_id_wishlist_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."wishlist_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_dedupe" ADD CONSTRAINT "notification_dedupe_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_dedupe" ADD CONSTRAINT "notification_dedupe_item_id_wishlist_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."wishlist_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "import_templates_user_id_idx" ON "import_templates" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "item_reservations_shared_wishlist_id_idx" ON "item_reservations" USING btree ("shared_wishlist_id");--> statement-breakpoint
CREATE INDEX "item_reservations_item_id_idx" ON "item_reservations" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "notification_dedupe_user_id_idx" ON "notification_dedupe" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_dedupe_item_id_idx" ON "notification_dedupe" USING btree ("item_id");