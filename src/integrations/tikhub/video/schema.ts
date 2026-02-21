import { z } from "zod";
import { unixTimestampToIso } from "../../../shared/date";
import { UpstreamResponseError } from "../../../shared/errors/app-error";
import { Result } from "../../../shared/result";
import { normalizeNumberValue } from "../../../shared/schemas/number";
import { normalizeStringValue } from "../../../shared/schemas/string";

const optionalNumericFieldSchema = z.preprocess(normalizeNumberValue, z.number().optional());
const optionalStringFieldSchema = z.preprocess(
  normalizeStringValue,
  z.string().min(1).optional(),
);

const tikhubAddressSchema = z.looseObject({
  uri: z.string().optional(),
  url_list: z.array(z.string()).optional(),
});

const tikhubVideoSchema = z.looseObject({
  duration: optionalNumericFieldSchema,
  download_no_watermark_addr: tikhubAddressSchema.optional(),
  download_addr: tikhubAddressSchema.optional(),
  play_addr: tikhubAddressSchema.optional(),
  cover: tikhubAddressSchema.optional(),
  origin_cover: tikhubAddressSchema.optional(),
  dynamic_cover: tikhubAddressSchema.optional(),
});

const tikhubMusicSchema = z.looseObject({
  play_url: tikhubAddressSchema.optional(),
});

const tikhubHashtagSchema = z.looseObject({
  cha_name: optionalStringFieldSchema,
});

const tikhubAuthorSchema = z.looseObject({
  uid: optionalStringFieldSchema,
  unique_id: optionalStringFieldSchema,
  nickname: optionalStringFieldSchema,
});

const tikhubStatisticsSchema = z.looseObject({
  play_count: optionalNumericFieldSchema,
  digg_count: optionalNumericFieldSchema,
  comment_count: optionalNumericFieldSchema,
  share_count: optionalNumericFieldSchema,
});

const tikhubDetailSchema = z.looseObject({
  aweme_id: optionalStringFieldSchema,
  aweme_id_str: optionalStringFieldSchema,
  desc: optionalStringFieldSchema,
  create_time: optionalNumericFieldSchema,
  duration: optionalNumericFieldSchema,
  cha_list: z.array(tikhubHashtagSchema).optional(),
  author: tikhubAuthorSchema.optional(),
  statistics: tikhubStatisticsSchema.optional(),
  music: tikhubMusicSchema.optional(),
  added_sound_music_info: tikhubMusicSchema.optional(),
  video: tikhubVideoSchema.optional(),
});

const tikhubResponseSchema = z.looseObject({
  data: z.looseObject({
    aweme_details: z.array(tikhubDetailSchema).optional(),
    aweme_detail: tikhubDetailSchema.optional(),
    video: tikhubVideoSchema.optional(),
  }),
});

const tikhubVideoInfoSchema = z.object({
  awemeId: z.string(),
  description: z.string().nullable(),
  durationMs: z.number().nullable(),
  createdAt: z.string().nullable(),
  hashtags: z.array(z.string()),
  author: z.object({
    userId: z.string().nullable(),
    username: z.string().nullable(),
    nickname: z.string().nullable(),
  }),
  stats: z.object({
    playCount: z.number().nullable(),
    likeCount: z.number().nullable(),
    commentCount: z.number().nullable(),
    shareCount: z.number().nullable(),
  }),
  thumbnailUrl: z.string().nullable(),
  audioUrl: z.string().nullable(),
  downloadUrl: z.string(),
});

export type TikHubVideoInfo = z.infer<typeof tikhubVideoInfoSchema>;

const getFirstUrl = (
  address: z.infer<typeof tikhubAddressSchema> | undefined,
): string | null => {
  const firstNonEmpty =
    address?.url_list?.map((value) => value.trim()).find((value) => value.length > 0) ?? null;

  if (firstNonEmpty) {
    return firstNonEmpty;
  }

  const uri = address?.uri?.trim();
  return uri && uri.length > 0 ? uri : null;
};

const extractHashtagsFromDescription = (description: string | null): string[] => {
  if (!description) {
    return [];
  }

  return (
    description.match(/#[\p{L}\p{N}_]+/gu)?.map((tag) => tag.slice(1)).filter(Boolean) ?? []
  );
};

const normalizeHashtag = (tag: string): string => tag.replace(/^#/, "").trim().toLowerCase();

/**
 * TikHub returns duration in milliseconds (>= 1000) or seconds (< 1000).
 * All known TikTok videos are at least one second long, so values under
 * 1000 are assumed to be in seconds and converted to milliseconds.
 */
const normalizeDurationMs = (value: number | undefined): number | null => {
  if (value === undefined) {
    return null;
  }

  return value >= 1_000 ? Math.round(value) : Math.round(value * 1_000);
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

  const awemeId = firstDetail?.aweme_id ?? firstDetail?.aweme_id_str;
  if (!awemeId) {
    return Result.err(
      new UpstreamResponseError({
        service: "TikHub",
        message: "TikHub response does not contain a video ID",
      }),
    );
  }

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
  const audioUrl =
    getFirstUrl(firstDetail?.music?.play_url) ??
    getFirstUrl(firstDetail?.added_sound_music_info?.play_url);

  const normalizedVideoInfo = {
    awemeId,
    description,
    durationMs,
    createdAt: unixTimestampToIso(firstDetail?.create_time),
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
    audioUrl,
    downloadUrl,
  } satisfies TikHubVideoInfo;

  const normalized = tikhubVideoInfoSchema.safeParse(normalizedVideoInfo);
  if (!normalized.success) {
    return Result.err(
      new UpstreamResponseError({
        service: "TikHub",
        message: "TikHub video normalization mismatch",
      }),
    );
  }

  return Result.ok(normalized.data);
};
