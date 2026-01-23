CREATE TABLE "store_shipping_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"country_code" text NOT NULL,
	"city_whitelist" text,
	"city_blacklist" text,
	"ships_to_country" boolean DEFAULT true NOT NULL,
	"ships_to_city" boolean DEFAULT true NOT NULL,
	"delivery_methods" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"domain" text NOT NULL,
	"type" text NOT NULL,
	"countries_supported" text NOT NULL,
	"requires_city" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stores_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "user_location" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"country_code" text NOT NULL,
	"country_name" text NOT NULL,
	"city" text,
	"region" text,
	"postal_code" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_location_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "store_shipping_rules" ADD CONSTRAINT "store_shipping_rules_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_location" ADD CONSTRAINT "user_location_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "store_shipping_rules_store_id_idx" ON "store_shipping_rules" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "stores_domain_idx" ON "stores" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "user_location_user_id_idx" ON "user_location" USING btree ("user_id");