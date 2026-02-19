import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import {
  bigint,
  bigserial,
  boolean,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  published: boolean('published').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const srcGrowiPosts = pgTable(
  'src_growi_posts',
  {
    growiPostId: bigint('growi_post_id', { mode: 'number' }).primaryKey(),
    shareUrl: text('share_url').notNull().unique(),
    platform: text('platform').notNull(),
    contentType: text('content_type'),
    externalId: text('external_id'),
    title: text('title'),
    connectedAccountId: text('connected_account_id'),
    connectedAccountUsername: text('connected_account_username'),
    profileShareUrl: text('profile_share_url'),
    campaignId: bigint('campaign_id', { mode: 'number' }),
    campaignName: text('campaign_name'),
    createTime: timestamp('create_time', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
    rawJson: jsonb('raw_json'),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    platformExternalUnique: uniqueIndex('src_growi_posts_platform_external_id_uk').on(
      table.platform,
      table.externalId,
    ),
  }),
);

export const srcGrowiPostMetrics = pgTable(
  'src_growi_post_metrics',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    growiPostId: bigint('growi_post_id', { mode: 'number' })
      .notNull()
      .references(() => srcGrowiPosts.growiPostId, { onDelete: 'cascade' }),
    viewCount: bigint('view_count', { mode: 'number' }).notNull(),
    likeCount: bigint('like_count', { mode: 'number' }).notNull(),
    commentCount: bigint('comment_count', { mode: 'number' }).notNull(),
    shareCount: bigint('share_count', { mode: 'number' }).notNull(),
    savesCount: bigint('saves_count', { mode: 'number' }),
    engagementRate: numeric('engagement_rate', { precision: 10, scale: 6 }),
    pulledAt: timestamp('pulled_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    postUnique: uniqueIndex('src_growi_post_metrics_post_uk').on(table.growiPostId),
  }),
);

export type Post = InferSelectModel<typeof posts>;
export type NewPost = InferInsertModel<typeof posts>;

export type SrcGrowiPost = InferSelectModel<typeof srcGrowiPosts>;
export type NewSrcGrowiPost = InferInsertModel<typeof srcGrowiPosts>;
export type SrcGrowiPostMetric = InferSelectModel<typeof srcGrowiPostMetrics>;
export type NewSrcGrowiPostMetric = InferInsertModel<typeof srcGrowiPostMetrics>;
