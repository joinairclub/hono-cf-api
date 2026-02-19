type GrowiApiConfig = {
  apiBaseUrl: string;
  organizationSlug: string;
  bearerToken: string;
  domainOrigin: string;
  source: string;
};

type GrowiPrivateMeta = {
  row_count: number;
  page_count: number;
  current_page: number;
  next_page: number | null;
  prev_page: number | null;
  total_count?: number;
  total_pages?: number;
};

export type GrowiUserContentRow = {
  id: number;
  share_url: string;
  platform: string;
  content_type: string | null;
  external_id: string | null;
  title: string | null;
  connected_account_id: string | number | null;
  connected_account_username: string | null;
  profile_share_url: string | null;
  campaign_id: number | null;
  campaign_name: string | null;
  create_time: number | null;
  updated_at: string | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  saves_count?: number | null;
  engagement_rate?: string | number | null;
  [key: string]: unknown;
};

export type GrowiUserContentsPage = {
  data: GrowiUserContentRow[];
  meta: GrowiPrivateMeta;
};

export class GrowiApiError extends Error {
  status: number;

  constructor(args: { status: number; message: string }) {
    super(args.message);
    this.name = 'GrowiApiError';
    this.status = args.status;
  }
}

const readConfig = (
  bindings: Env,
  key: string,
  fallback?: string,
): string | undefined => {
  const value = (bindings as unknown as Record<string, unknown>)[key];

  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  const envValue = process.env[key];

  if (typeof envValue === 'string' && envValue.length > 0) {
    return envValue;
  }

  return fallback;
};

export const getGrowiApiConfig = (bindings: Env): GrowiApiConfig => {
  const apiBaseUrl = readConfig(bindings, 'GROWI_API_BASE_URL', 'https://api.growi.io');
  const organizationSlug =
    readConfig(bindings, 'GROWI_ORGANIZATION_SLUG', 'airclub-f80c0262') ??
    'airclub-f80c0262';
  const bearerToken = readConfig(bindings, 'GROWI_PRIVATE_BEARER_TOKEN');
  const domainOrigin = readConfig(bindings, 'GROWI_DOMAIN_ORIGIN', 'https://www.growi.io');
  const source = readConfig(bindings, 'GROWI_USER_CONTENTS_SOURCE', 'management_posts');

  if (!apiBaseUrl) {
    throw new Error('Missing GROWI_API_BASE_URL');
  }

  if (!bearerToken) {
    throw new Error('Missing GROWI_PRIVATE_BEARER_TOKEN');
  }

  if (!domainOrigin) {
    throw new Error('Missing GROWI_DOMAIN_ORIGIN');
  }

  if (!source) {
    throw new Error('Missing GROWI_USER_CONTENTS_SOURCE');
  }

  return { apiBaseUrl, organizationSlug, bearerToken, domainOrigin, source };
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
): Promise<GrowiUserContentsPage> => {
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
      'user-agent': 'hono-cf-api/1.0',
    },
  });

  if (!response.ok) {
    throw new GrowiApiError({
      status: response.status,
      message: await toErrorMessage(response),
    });
  }

  const json = (await response.json()) as Partial<GrowiUserContentsPage>;

  if (!Array.isArray(json.data) || !json.meta) {
    throw new GrowiApiError({
      status: 502,
      message: 'Unexpected Growi response shape',
    });
  }

  return {
    data: json.data as GrowiUserContentRow[],
    meta: json.meta as GrowiPrivateMeta,
  };
};
