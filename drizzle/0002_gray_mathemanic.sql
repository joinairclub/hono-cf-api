ALTER TABLE "src_growi_post_metrics" ADD COLUMN "saves_count" bigint;--> statement-breakpoint
ALTER TABLE "src_growi_post_metrics" ADD COLUMN "raw_json" jsonb;--> statement-breakpoint
ALTER TABLE "src_growi_posts" ADD COLUMN "connected_account_id" text;--> statement-breakpoint
ALTER TABLE "src_growi_posts" ADD COLUMN "campaign_id" bigint;--> statement-breakpoint
ALTER TABLE "src_growi_posts" ADD COLUMN "campaign_name" text;--> statement-breakpoint
ALTER TABLE "src_growi_posts" ADD COLUMN "updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "src_growi_posts" ADD COLUMN "raw_json" jsonb;--> statement-breakpoint
CREATE UNIQUE INDEX "src_growi_posts_platform_external_id_uk" ON "src_growi_posts" USING btree ("platform","external_id");