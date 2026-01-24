CREATE TABLE "city_search_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"query" text NOT NULL,
	"country_code" text,
	"results_json" text NOT NULL,
	"cached_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_location" ADD COLUMN "geoname_id" text;--> statement-breakpoint
ALTER TABLE "user_location" ADD COLUMN "lat" numeric(10, 6);--> statement-breakpoint
ALTER TABLE "user_location" ADD COLUMN "lng" numeric(10, 6);--> statement-breakpoint
CREATE INDEX "city_search_cache_query_idx" ON "city_search_cache" USING btree ("query");--> statement-breakpoint
CREATE INDEX "city_search_cache_country_code_idx" ON "city_search_cache" USING btree ("country_code");