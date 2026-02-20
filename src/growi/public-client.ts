import { z } from 'zod';
import { Result } from '../lib/result';
import { GrowiApiError } from './private-client';

const growiIntSchema = z.preprocess((value) => {
  if (typeof value === 'string') {
    const normalized = value.replaceAll(',', '').trim();
    if (normalized.length > 0) {
      return Number(normalized);
    }
  }

  return value;
}, z.number().int().nonnegative());

const growiPublicPostMetricsSchema = z.object({
  views: growiIntSchema,
  likes: growiIntSchema,
  comments: growiIntSchema,
  shares: growiIntSchema,
});

export const growiPublicTopPostSchema = z.object({
  id: growiIntSchema,
  title: z.string().nullable().optional(),
  share_url: z.string(),
  platform: z.string(),
  content_type: z.string().nullable().optional(),
  external_id: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  profile_share_url: z.string().nullable().optional(),
  metrics: growiPublicPostMetricsSchema,
  gmv: z.string().nullable().optional(),
});

export type GrowiPublicTopPost = z.infer<typeof growiPublicTopPostSchema>;

const growiPublicTopPostsByViewsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    top_posts_by_views: z.array(growiPublicTopPostSchema),
  }),
  meta: z.object({
    current_page: growiIntSchema,
    per_page: growiIntSchema.optional(),
    row_count: growiIntSchema,
    page_count: growiIntSchema,
    has_more: z.boolean().optional(),
  }),
});

export type GrowiPublicTopPostsByViewsResponse = z.infer<
  typeof growiPublicTopPostsByViewsResponseSchema
>;

const growiPublicApiConfigSchema = z.object({
  apiBaseUrl: z.string().min(1),
  publicApiKey: z.string().trim().min(1),
});

type GrowiPublicApiConfig = z.infer<typeof growiPublicApiConfigSchema>;

const GROWI_API_BASE_URL = 'https://api.growi.io';

const toErrorMessage = async (response: Response): Promise<string> => {
  const text = await response.text();
  return text.length > 0 ? text : `HTTP ${response.status}`;
};

export const getGrowiPublicApiConfig = (
  args: { publicApiKey: string },
): Result<GrowiPublicApiConfig, GrowiApiError> => {
  const parsed = growiPublicApiConfigSchema.safeParse({
    apiBaseUrl: GROWI_API_BASE_URL,
    publicApiKey: args.publicApiKey,
  });

  if (!parsed.success) {
    return Result.err(
      new GrowiApiError({
        status: 0,
        message: 'Invalid Growi public API config',
        cause: parsed.error,
      }),
    );
  }

  return Result.ok(parsed.data);
};

export const fetchGrowiTopPostsByViewsPage = async (
  config: GrowiPublicApiConfig,
  args: {
    startDate: string;
    endDate: string;
    page: number;
    limit: number;
    perPage?: number;
    includeGmv?: boolean;
  },
): Promise<Result<GrowiPublicTopPostsByViewsResponse, GrowiApiError>> => {
  return Result.tryPromise({
    try: async () => {
      const url = new URL('/api/public/v1/stats/top_posts_by_views', config.apiBaseUrl);

      url.searchParams.set('start_date', args.startDate);
      url.searchParams.set('end_date', args.endDate);
      url.searchParams.set('page', String(args.page));
      url.searchParams.set('limit', String(args.limit));
      if (typeof args.perPage === 'number') {
        url.searchParams.set('per_page', String(args.perPage));
      }
      url.searchParams.set('include_gmv', String(Boolean(args.includeGmv)));

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          authorization: `Bearer ${config.publicApiKey}`,
          'content-type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new GrowiApiError({
          status: response.status,
          message: await toErrorMessage(response),
        });
      }

      const parsed = growiPublicTopPostsByViewsResponseSchema.safeParse(
        await response.json(),
      );
      if (!parsed.success) {
        const firstIssue = parsed.error.issues[0];
        const detail = firstIssue
          ? `${firstIssue.path.join('.')}: ${firstIssue.message}`
          : 'invalid payload';

        throw new GrowiApiError({
          status: 502,
          message: `Unexpected Growi public response shape (${detail})`,
          cause: parsed.error,
        });
      }

      if (!parsed.data.success) {
        throw new GrowiApiError({
          status: 502,
          message: 'Growi public API returned success=false',
          cause: parsed.data,
        });
      }

      return parsed.data;
    },
    catch: (cause) => {
      if (GrowiApiError.is(cause)) {
        return cause;
      }

      return new GrowiApiError({
        status: 0,
        message:
          cause instanceof Error ? cause.message : `Growi public request failed: ${String(cause)}`,
        cause,
      });
    },
  });
};
