import type { Db } from '../db/client';
import { DbQueryError } from '../errors/app-error';
import { Result } from '../lib/result';
import type { GrowiUserContentRow } from './private-client';
import {
  fetchGrowiTopPostsByViewsPage,
  getGrowiPublicApiConfig,
  GrowiPublicTopPost,
} from './public-client';
import { GrowiApiError } from './private-client';
import { upsertGrowiPage } from './repository';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const shouldRetryGrowiError = (error: GrowiApiError): boolean => {
  if (error.status === 0 || error.status === 429 || error.status >= 500) {
    return true;
  }

  if (error.status === 422 && error.message.toLowerCase().includes('request timeout')) {
    return true;
  }

  return false;
};

const toGrowiApiError = (cause: unknown): GrowiApiError => {
  if (GrowiApiError.is(cause)) {
    return cause;
  }

  return new GrowiApiError({
    status: 0,
    message:
      cause instanceof Error ? cause.message : `Growi public request failed: ${String(cause)}`,
    cause,
  });
};

const toInternalPostRow = (post: GrowiPublicTopPost): GrowiUserContentRow => {
  return {
    id: post.id,
    share_url: post.share_url,
    platform: post.platform,
    content_type: post.content_type ?? null,
    external_id: post.external_id ?? null,
    title: post.title ?? null,
    connected_account_id: null,
    connected_account_username: post.username ?? null,
    profile_share_url: post.profile_share_url ?? null,
    campaign_id: null,
    campaign_name: null,
    create_time: null,
    updated_at: null,
    view_count: post.metrics.views,
    like_count: post.metrics.likes,
    comment_count: post.metrics.comments,
    share_count: post.metrics.shares,
    saves_count: null,
    engagement_rate: null,
    gmv: post.gmv ?? null,
    raw_source: 'public_top_posts_by_views',
  };
};

export type GrowiPublicSyncSummary = {
  startDate: string;
  endDate: string;
  limit: number;
  perPage: number;
  includeGmv: boolean;
  pagesFetched: number;
  rowsFetched: number;
  rowCount: number;
  pageCount: number;
  completedAt: string;
};

export const syncGrowiTopPostsByViews = async (
  db: Db,
  args: {
    publicApiKey: string;
    startDate: string;
    endDate: string;
    limit: number;
    perPage: number;
    includeGmv: boolean;
    maxPages?: number;
  },
): Promise<Result<GrowiPublicSyncSummary, DbQueryError>> => {
  return Result.gen(async function* () {
    const config = yield* getGrowiPublicApiConfig({
      publicApiKey: args.publicApiKey,
    }).mapError(
      (error) =>
        new DbQueryError({
          operation: 'build growi public api config',
          cause: error,
        }),
    );

    let page = 1;
    let pagesFetched = 0;
    let rowsFetched = 0;
    let rowCount = 0;
    let pageCount = 0;

    while (true) {
      if (args.maxPages && pagesFetched >= args.maxPages) {
        break;
      }

      const response = yield* Result.await(
        Result.tryPromise(
          {
            try: async () => {
              const result = await fetchGrowiTopPostsByViewsPage(config, {
                startDate: args.startDate,
                endDate: args.endDate,
                page,
                limit: args.limit,
                perPage: args.perPage,
                includeGmv: args.includeGmv,
              });

              if (result.isErr()) {
                throw result.error;
              }

              return result.value;
            },
            catch: toGrowiApiError,
          },
          {
            retry: {
              times: 3,
              delayMs: 1000,
              backoff: 'linear',
              shouldRetry: shouldRetryGrowiError,
            },
          },
        ).then((result) =>
          result.mapError(
            (error) =>
              new DbQueryError({
                operation: 'fetch growi public top_posts_by_views page',
                cause: error,
              }),
          ),
        ),
      );

      const rows = response.data.top_posts_by_views.map(toInternalPostRow);

      pagesFetched += 1;
      rowsFetched += rows.length;
      rowCount = response.meta.row_count;
      pageCount = response.meta.page_count;

      yield* Result.await(upsertGrowiPage(db, rows));

      const noMorePagesByMeta =
        response.meta.page_count === 0 || response.meta.current_page >= response.meta.page_count;
      const noMorePagesByFlag = response.meta.has_more === false;

      if (rows.length === 0 || noMorePagesByMeta || noMorePagesByFlag) {
        break;
      }

      page += 1;
      await sleep(2200);
    }

    return Result.ok({
      startDate: args.startDate,
      endDate: args.endDate,
      limit: args.limit,
      perPage: args.perPage,
      includeGmv: args.includeGmv,
      pagesFetched,
      rowsFetched,
      rowCount,
      pageCount,
      completedAt: new Date().toISOString(),
    });
  });
};
