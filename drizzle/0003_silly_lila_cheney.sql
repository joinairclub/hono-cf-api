DROP INDEX "src_growi_post_metrics_post_window_uk";--> statement-breakpoint
CREATE UNIQUE INDEX "src_growi_post_metrics_post_uk" ON "src_growi_post_metrics" USING btree ("growi_post_id");--> statement-breakpoint
ALTER TABLE "src_growi_post_metrics" DROP COLUMN "source_api";--> statement-breakpoint
ALTER TABLE "src_growi_post_metrics" DROP COLUMN "window_start";--> statement-breakpoint
ALTER TABLE "src_growi_post_metrics" DROP COLUMN "window_end";