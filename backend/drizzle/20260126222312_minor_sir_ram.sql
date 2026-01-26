CREATE TABLE "user_alert_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"alerts_enabled" boolean DEFAULT true NOT NULL,
	"notify_price_drops" boolean DEFAULT true NOT NULL,
	"notify_under_target" boolean DEFAULT true NOT NULL,
	"weekly_digest" boolean DEFAULT false NOT NULL,
	"quiet_hours_enabled" boolean DEFAULT false NOT NULL,
	"quiet_start" text,
	"quiet_end" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_alert_settings" ADD CONSTRAINT "user_alert_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;