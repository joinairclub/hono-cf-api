import { z } from 'zod';
import { Result, TaggedError } from '../lib/result';

const growiApiConfigSchema = z.object({
  apiBaseUrl: z.string(),
  organizationSlug: z.string(),
  bearerToken: z.string(),
  domainOrigin: z.string(),
  source: z.string(),
});

type GrowiApiConfig = z.infer<typeof growiApiConfigSchema>;

const growiPrivateMetaSchema = z.object({
  row_count: z.number(),
  page_count: z.number(),
  current_page: z.number(),
  next_page: z.number().nullable(),
  prev_page: z.number().nullable(),
  total_count: z.number().optional(),
  total_pages: z.number().optional(),
});

const growiUserContentRowSchema = z
  .object({
    id: z.number(),
    share_url: z.string(),
    platform: z.string(),
    content_type: z.string().nullable(),
    external_id: z.string().nullable(),
    title: z.string().nullable(),
    connected_account_id: z.union([z.string(), z.number()]).nullable(),
    connected_account_username: z.string().nullable(),
    profile_share_url: z.string().nullable(),
    campaign_id: z.number().nullable(),
    campaign_name: z.string().nullable(),
    create_time: z.number().nullable(),
    updated_at: z.string().nullable(),
    view_count: z.number(),
    like_count: z.number(),
    comment_count: z.number(),
    share_count: z.number(),
    saves_count: z.number().nullable().optional(),
    engagement_rate: z.union([z.string(), z.number()]).nullable().optional(),
  })
  .passthrough();

export type GrowiUserContentRow = z.infer<typeof growiUserContentRowSchema>;

const growiUserContentsPageSchema = z.object({
  data: z.array(growiUserContentRowSchema),
  meta: growiPrivateMetaSchema,
});

export type GrowiUserContentsPage = z.infer<typeof growiUserContentsPageSchema>;

export class GrowiApiError extends TaggedError('GrowiApiError')<{
  status: number;
  message: string;
  cause?: unknown;
}>() {}

const GROWI_API_BASE_URL = 'https://api.growi.io';
const GROWI_ORGANIZATION_SLUG = 'airclub-f80c0262';
const GROWI_DOMAIN_ORIGIN = 'https://www.growi.io';
const GROWI_USER_CONTENTS_SOURCE = 'management_posts';

export const getGrowiApiConfig = (
  args: { bearerToken: string },
): Result<GrowiApiConfig, GrowiApiError> => {
  const parsed = growiApiConfigSchema.safeParse({
    apiBaseUrl: GROWI_API_BASE_URL,
    organizationSlug: GROWI_ORGANIZATION_SLUG,
    bearerToken: args.bearerToken,
    domainOrigin: GROWI_DOMAIN_ORIGIN,
    source: GROWI_USER_CONTENTS_SOURCE,
  });

  if (!parsed.success) {
    return Result.err(
      new GrowiApiError({
        status: 0,
        message: 'Invalid Growi API config',
        cause: parsed.error,
      }),
    );
  }

  return Result.ok(parsed.data);
};

const toErrorMessage = async (response: Response): Promise<string> => {
  const text = await response.text();
  return text.length > 0 ? text : `HTTP ${response.status}`;
};

export const fetchGrowiUserContentsPage = async (
  config: GrowiApiConfig,
  args: {
    startDate: string;
    endDate: string;
    page: number;
    perPage: number;
  },
): Promise<Result<GrowiUserContentsPage, GrowiApiError>> => {
  return Result.tryPromise({
    try: async () => {
      const url = new URL(
        `/api/v1/organizations/${config.organizationSlug}/user_contents`,
        config.apiBaseUrl,
      );

      url.searchParams.set('start_date', args.startDate);
      url.searchParams.set('end_date', args.endDate);
      url.searchParams.set('page', String(args.page));
      url.searchParams.set('per_page', String(args.perPage));
      url.searchParams.set('search', '');
      url.searchParams.set('sort_by', 'view_count');
      url.searchParams.set('sort_direction', 'desc');
      url.searchParams.set('source', config.source);
      url.searchParams.set('organization_id', config.organizationSlug);
      url.searchParams.set('domain_origin', config.domainOrigin);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          accept: '*/*',
          'app-name': 'web',
          authorization: `Bearer ${config.bearerToken}`,
          'content-type': 'application/json',
          origin: config.domainOrigin,
          referer: `${config.domainOrigin}/`,
        },
      });

      if (!response.ok) {
        throw new GrowiApiError({
          status: response.status,
          message: await toErrorMessage(response),
        });
      }

      const parsed = growiUserContentsPageSchema.safeParse(await response.json());
      if (!parsed.success) {
        const firstIssue = parsed.error.issues[0];
        const detail = firstIssue
          ? `${firstIssue.path.join('.')}: ${firstIssue.message}`
          : 'invalid payload';

        throw new GrowiApiError({
          status: 502,
          message: `Unexpected Growi response shape (${detail})`,
          cause: parsed.error,
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
          cause instanceof Error ? cause.message : `Growi request failed: ${String(cause)}`,
        cause,
      });
    },
  });
};
