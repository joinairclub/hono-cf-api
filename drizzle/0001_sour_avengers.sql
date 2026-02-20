CREATE TABLE "src_growi_post_metrics" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"growi_post_id" bigint NOT NULL,
	"source_api" text DEFAULT 'private_user_contents' NOT NULL,
	"window_start" date NOT NULL,
	"window_end" date NOT NULL,
	"view_count" bigint NOT NULL,
	"like_count" bigint NOT NULL,
	"comment_count" bigint NOT NULL,
	"share_count" bigint NOT NULL,
	"engagement_rate" numeric(10, 6),
	"pulled_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "src_growi_posts" (
	"growi_post_id" bigint PRIMARY KEY NOT NULL,
	"share_url" text NOT NULL,
	"platform" text NOT NULL,
	"content_type" text,
	"external_id" text,
	"title" text,
	"connected_account_username" text,
	"profile_share_url" text,
	"create_time" timestamp with time zone,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "src_growi_posts_share_url_unique" UNIQUE("share_url")
);
--> statement-breakpoint
ALTER TABLE "src_growi_post_metrics" ADD CONSTRAINT "src_growi_post_metrics_growi_post_id_src_growi_posts_growi_post_id_fk" FOREIGN KEY ("growi_post_id") REFERENCES "public"."src_growi_posts"("growi_post_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "src_growi_post_metrics_post_window_uk" ON "src_growi_post_metrics" USING btree ("growi_post_id","source_api","window_start","window_end");