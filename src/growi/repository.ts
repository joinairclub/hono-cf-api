import { sql } from 'drizzle-orm';
import { DbQueryError } from '../errors/app-error';
import type { Db } from '../db/client';
import { srcGrowiPostMetrics, srcGrowiPosts } from '../db/schema';
import { Result } from '../lib/result';
import type { GrowiUserContentRow } from './private-client';

const unixSecondsToDate = (value: number | null): Date | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return new Date(value * 1000);
};

const isoToDate = (value: string | null): Date | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseEngagementRate = (
  value: string | number | null | undefined,
): string | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toString();
  }

  if (typeof value !== 'string') {
    return null;
  }

  const numeric = Number.parseFloat(value.replace('%', '').trim());
  return Number.isFinite(numeric) ? numeric.toString() : null;
};

type UpsertResult = {
  rowsProcessed: number;
};

export const upsertGrowiPage = async (
  db: Db,
  rows: GrowiUserContentRow[],
): Promise<Result<UpsertResult, DbQueryError>> => {
  return Result.tryPromise({
    try: async () => {
      if (rows.length === 0) {
        return { rowsProcessed: 0 };
      }

      const now = new Date();

      const posts = rows.map((row) => ({
        growiPostId: row.id,
        shareUrl: row.share_url,
        platform: row.platform,
        contentType: row.content_type,
        externalId: row.external_id,
        title: row.title,
        connectedAccountId:
          row.connected_account_id == null ? null : String(row.connected_account_id),
        connectedAccountUsername: row.connected_account_username,
        profileShareUrl: row.profile_share_url,
        campaignId: row.campaign_id,
        campaignName: row.campaign_name,
        createTime: unixSecondsToDate(row.create_time),
        updatedAt: isoToDate(row.updated_at),
        rawJson: row,
        firstSeenAt: now,
        lastSeenAt: now,
      }));

      const metrics = rows.map((row) => ({
        growiPostId: row.id,
        viewCount: row.view_count ?? 0,
        likeCount: row.like_count ?? 0,
        commentCount: row.comment_count ?? 0,
        shareCount: row.share_count ?? 0,
        savesCount: row.saves_count ?? null,
        engagementRate: parseEngagementRate(row.engagement_rate),
        pulledAt: now,
      }));

      await db.transaction(async (tx) => {
        await tx
          .insert(srcGrowiPosts)
          .values(posts)
          .onConflictDoUpdate({
            target: srcGrowiPosts.growiPostId,
            set: {
              shareUrl: sql`excluded.share_url`,
              platform: sql`excluded.platform`,
              contentType: sql`excluded.content_type`,
              externalId: sql`excluded.external_id`,
              title: sql`excluded.title`,
              connectedAccountId: sql`excluded.connected_account_id`,
              connectedAccountUsername: sql`excluded.connected_account_username`,
              profileShareUrl: sql`excluded.profile_share_url`,
              campaignId: sql`excluded.campaign_id`,
              campaignName: sql`excluded.campaign_name`,
              createTime: sql`excluded.create_time`,
              updatedAt: sql`excluded.updated_at`,
              rawJson: sql`excluded.raw_json`,
              lastSeenAt: sql`excluded.last_seen_at`,
            },
          });

        await tx
          .insert(srcGrowiPostMetrics)
          .values(metrics)
          .onConflictDoUpdate({
            target: srcGrowiPostMetrics.growiPostId,
            set: {
              viewCount: sql`excluded.view_count`,
              likeCount: sql`excluded.like_count`,
              commentCount: sql`excluded.comment_count`,
              shareCount: sql`excluded.share_count`,
              savesCount: sql`excluded.saves_count`,
              engagementRate: sql`excluded.engagement_rate`,
              pulledAt: sql`excluded.pulled_at`,
            },
          });
      });

      return { rowsProcessed: rows.length };
    },
    catch: (cause) => new DbQueryError({ operation: 'upsert growi page', cause }),
  });
};
