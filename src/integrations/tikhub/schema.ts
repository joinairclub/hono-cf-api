import { z } from "zod";
import { UpstreamResponseError } from "../../shared/errors/app-error";
import { Result } from "../../shared/result";

const numericFieldSchema = z.preprocess(
  (value) => {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : undefined;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) {
        return undefined;
      }

      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? trimmed : undefined;
    }

    if (value === null || value === undefined) {
      return undefined;
    }

    return undefined;
  },
  z.coerce.number(),
);

const stringFieldSchema = z
  .preprocess((value) => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }

    if (typeof value === "number") {
      return Number.isFinite(value) ? value : undefined;
    }

    return undefined;
  }, z.coerce.string().trim().min(1));

const tikhubAddressSchema = z.looseObject({
  url_list: z.array(z.string()).optional(),
});

const tikhubVideoSchema = z.looseObject({
  duration: numericFieldSchema.optional(),
  download_no_watermark_addr: tikhubAddressSchema.optional(),
  download_addr: tikhubAddressSchema.optional(),
  play_addr: tikhubAddressSchema.optional(),
  cover: tikhubAddressSchema.optional(),
  origin_cover: tikhubAddressSchema.optional(),
  dynamic_cover: tikhubAddressSchema.optional(),
});

const tikhubHashtagSchema = z.looseObject({
  cha_name: stringFieldSchema.optional(),
});

const tikhubAuthorSchema = z.looseObject({
  uid: stringFieldSchema.optional(),
  unique_id: stringFieldSchema.optional(),
  nickname: stringFieldSchema.optional(),
});

const tikhubStatisticsSchema = z.looseObject({
  play_count: numericFieldSchema.optional(),
  digg_count: numericFieldSchema.optional(),
  comment_count: numericFieldSchema.optional(),
  share_count: numericFieldSchema.optional(),
});

const tikhubDetailSchema = z.looseObject({
  aweme_id: stringFieldSchema.optional(),
  aweme_id_str: stringFieldSchema.optional(),
  desc: stringFieldSchema.optional(),
  create_time: numericFieldSchema.optional(),
  duration: numericFieldSchema.optional(),
  cha_list: z.array(tikhubHashtagSchema).optional(),
  author: tikhubAuthorSchema.optional(),
  statistics: tikhubStatisticsSchema.optional(),
  video: tikhubVideoSchema.optional(),
});

const tikhubResponseSchema = z.looseObject({
  data: z.looseObject({
    aweme_details: z.array(tikhubDetailSchema).optional(),
    aweme_detail: tikhubDetailSchema.optional(),
    video: tikhubVideoSchema.optional(),
  }),
});

export type TikHubDownloadInfo = {
  awemeId: string;
  downloadUrl: string;
};

export type TikHubVideoInfo = {
  awemeId: string;
  description: string | null;
  durationMs: number | null;
  createdAt: string | null;
  hashtags: string[];
  author: {
    userId: string | null;
    username: string | null;
    nickname: string | null;
  };
  stats: {
    playCount: number | null;
    likeCount: number | null;
    commentCount: number | null;
    shareCount: number | null;
  };
  thumbnailUrl: string | null;
  downloadUrl: string;
};

const getFirstUrl = (
  address: z.infer<typeof tikhubAddressSchema> | undefined,
): string | null => {
  const url = address?.url_list?.find((value) => value.trim().length > 0);
  return url?.trim() ?? null;
};

const extractHashtagsFromDescription = (description: string | null): string[] => {
  if (!description) {
    return [];
  }

  return (
    description.match(/#[A-Za-z0-9_]+/g)?.map((tag) => tag.slice(1)).filter(Boolean) ?? []
  );
};

const normalizeHashtag = (tag: string): string => tag.replace(/^#/, "").trim().toLowerCase();

const normalizeDurationMs = (value: number | undefined): number | null => {
  if (value === undefined) {
    return null;
  }

  return value >= 1_000 ? Math.round(value) : Math.round(value * 1_000);
};

const unixToIso = (value: number | undefined): string | null => {
  if (value === undefined) {
    return null;
  }

  const milliseconds = value >= 1_000_000_000_000 ? value : value * 1_000;
  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const extractTikHubVideoInfo = (
  payload: unknown,
): Result<TikHubVideoInfo, UpstreamResponseError> => {
  const parsed = tikhubResponseSchema.safeParse(payload);
  if (!parsed.success) {
    return Result.err(
      new UpstreamResponseError({
        service: "TikHub",
        message: "TikHub response schema mismatch",
      }),
    );
  }

  const data = parsed.data.data;
  const firstDetail = data.aweme_details?.[0] ?? data.aweme_detail;
  const video = firstDetail?.video ?? data.video;
  const noWatermarkUrl = getFirstUrl(video?.download_no_watermark_addr);
  const downloadUrl =
    noWatermarkUrl ?? getFirstUrl(video?.download_addr) ?? getFirstUrl(video?.play_addr);

  if (!downloadUrl) {
    return Result.err(
      new UpstreamResponseError({
        service: "TikHub",
        message: "TikHub response does not contain a downloadable video URL",
      }),
    );
  }

  const awemeId = firstDetail?.aweme_id ?? firstDetail?.aweme_id_str ?? crypto.randomUUID();

  const hashtagsFromTopics =
    firstDetail?.cha_list
      ?.map((item) => item.cha_name)
      .filter((tag): tag is string => Boolean(tag))
      .map(normalizeHashtag) ?? [];

  const description = firstDetail?.desc ?? null;
  const hashtags = Array.from(
    new Set([
      ...hashtagsFromTopics,
      ...extractHashtagsFromDescription(description).map(normalizeHashtag),
    ]),
  );

  const durationMs =
    normalizeDurationMs(video?.duration) ?? normalizeDurationMs(firstDetail?.duration);

  return Result.ok({
    awemeId,
    description,
    durationMs,
    createdAt: unixToIso(firstDetail?.create_time),
    hashtags,
    author: {
      userId: firstDetail?.author?.uid ?? null,
      username: firstDetail?.author?.unique_id ?? null,
      nickname: firstDetail?.author?.nickname ?? null,
    },
    stats: {
      playCount: firstDetail?.statistics?.play_count ?? null,
      likeCount: firstDetail?.statistics?.digg_count ?? null,
      commentCount: firstDetail?.statistics?.comment_count ?? null,
      shareCount: firstDetail?.statistics?.share_count ?? null,
    },
    thumbnailUrl:
      getFirstUrl(video?.origin_cover) ??
      getFirstUrl(video?.cover) ??
      getFirstUrl(video?.dynamic_cover),
    downloadUrl,
  });
};

export const extractTikHubDownloadInfo = (
  payload: unknown,
): Result<TikHubDownloadInfo, UpstreamResponseError> =>
  extractTikHubVideoInfo(payload).map((info) => ({
    awemeId: info.awemeId,
    downloadUrl: info.downloadUrl,
  }));
