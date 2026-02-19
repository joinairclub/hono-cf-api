import type { Db } from '../db/client';
import { Result } from '../lib/result';
import { DbQueryError } from '../errors/app-error';
import {
  fetchGrowiUserContentsPage,
  getGrowiApiConfig,
  GrowiApiError,
  type GrowiUserContentsPage,
} from './private-client';
import { upsertGrowiPage } from './repository';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const shouldRetryGrowiError = (error: unknown): boolean => {
  if (!(error instanceof GrowiApiError)) {
    return false;
  }

  if (error.status >= 500) {
    return true;
  }

  if (error.status === 422 && error.message.includes('Request timeout')) {
    return true;
  }

  return false;
};

const fetchPageWithRetry = async (
  fetcher: () => Promise<GrowiUserContentsPage>,
): Promise<GrowiUserContentsPage> => {
  const maxAttempts = 4;
  let attempt = 1;

  while (true) {
    try {
      return await fetcher();
    } catch (error) {
      if (!shouldRetryGrowiError(error) || attempt >= maxAttempts) {
        throw error;
      }

      await sleep(1000 * attempt);
      attempt += 1;
    }
  }
};

export type GrowiSyncSummary = {
  startDate: string;
  endDate: string;
  perPage: number;
  pagesFetched: number;
  rowsFetched: number;
  rowCount: number;
  pageCount: number;
  completedAt: string;
};

export const syncGrowiUserContents = async (
  db: Db,
  bindings: Env,
  args: {
    startDate: string;
    endDate: string;
    perPage: number;
    maxPages?: number;
  },
): Promise<Result<GrowiSyncSummary, DbQueryError>> => {
  return Result.tryPromise({
    try: async () => {
      const config = getGrowiApiConfig(bindings);

      let page = 1;
      let pagesFetched = 0;
      let rowsFetched = 0;
      let rowCount = 0;
      let pageCount = 0;

      while (true) {
        if (args.maxPages && pagesFetched >= args.maxPages) {
          break;
        }

        const response: GrowiUserContentsPage = await fetchPageWithRetry(() =>
          fetchGrowiUserContentsPage(config, {
            startDate: args.startDate,
            endDate: args.endDate,
            page,
            perPage: args.perPage,
          }),
        );

        pagesFetched += 1;
        rowsFetched += response.data.length;
        rowCount = response.meta.row_count;
        pageCount = response.meta.page_count;

        const upsertResult = await upsertGrowiPage(db, response.data);
        if (upsertResult.isErr()) {
          throw upsertResult.error;
        }

        if (!response.meta.next_page || response.data.length === 0) {
          break;
        }

        page = response.meta.next_page;
        await sleep(300);
      }

      return {
        startDate: args.startDate,
        endDate: args.endDate,
        perPage: args.perPage,
        pagesFetched,
        rowsFetched,
        rowCount,
        pageCount,
        completedAt: new Date().toISOString(),
      };
    },
    catch: (cause) => {
      if (cause instanceof DbQueryError) {
        return cause;
      }

      return new DbQueryError({ operation: 'sync growi user contents', cause });
    },
  });
};
