CREATE TABLE "shared_wishlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wishlist_id" uuid NOT NULL,
	"share_slug" text NOT NULL,
	"visibility" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shared_wishlists_wishlist_id_unique" UNIQUE("wishlist_id"),
	CONSTRAINT "shared_wishlists_share_slug_unique" UNIQUE("share_slug")
);
--> statement-breakpoint
CREATE TABLE "wishlist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wishlist_id" uuid NOT NULL,
	"original_url" text,
	"source_domain" text,
	"title" text NOT NULL,
	"image_url" text,
	"current_price" numeric(10, 2),
	"currency" text DEFAULT 'USD' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "items" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "items" CASCADE;--> statement-breakpoint
ALTER TABLE "wishlists" DROP CONSTRAINT "wishlists_share_token_unique";--> statement-breakpoint
ALTER TABLE "wishlists" DROP COLUMN "is_default";--> statement-breakpoint
ALTER TABLE "wishlists" DROP COLUMN "share_token";--> statement-breakpoint
DROP INDEX IF EXISTS "wishlists_share_token_idx";--> statement-breakpoint
ALTER TABLE "shared_wishlists" ADD CONSTRAINT "shared_wishlists_wishlist_id_wishlists_id_fk" FOREIGN KEY ("wishlist_id") REFERENCES "public"."wishlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_wishlist_id_wishlists_id_fk" FOREIGN KEY ("wishlist_id") REFERENCES "public"."wishlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shared_wishlists_wishlist_id_idx" ON "shared_wishlists" USING btree ("wishlist_id");--> statement-breakpoint
CREATE INDEX "wishlist_items_wishlist_id_idx" ON "wishlist_items" USING btree ("wishlist_id");--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_item_id_wishlist_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."wishlist_items"("id") ON DELETE cascade ON UPDATE no action;