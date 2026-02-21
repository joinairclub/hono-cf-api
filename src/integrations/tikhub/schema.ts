import { z } from "zod";
import { UpstreamResponseError } from "../../shared/errors/app-error";
import { Result } from "../../shared/result";
import { normalizeNumberValue } from "../../shared/schemas/number";
import { normalizeOptionalBoolean, normalizeStringValue } from "../../shared/schemas/string";

const numericFieldSchema = z.preprocess(normalizeNumberValue, z.number());
const stringFieldSchema = z.preprocess(normalizeStringValue, z.string().min(1));
const booleanFieldSchema = z.preprocess(normalizeOptionalBoolean, z.boolean());

const tikhubAddressSchema = z.looseObject({
  uri: z.string().optional(),
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

const tikhubMusicSchema = z.looseObject({
  play_url: tikhubAddressSchema.optional(),
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

const tikhubProfileUserSchema = z.looseObject({
  id: stringFieldSchema.optional(),
  uniqueId: stringFieldSchema.optional(),
  secUid: stringFieldSchema.optional(),
  nickname: stringFieldSchema.optional(),
  verified: booleanFieldSchema.optional(),
  signature: stringFieldSchema.optional(),
  createTime: numericFieldSchema.optional(),
  avatarThumb: stringFieldSchema.optional(),
  avatarMedium: stringFieldSchema.optional(),
  avatarLarger: stringFieldSchema.optional(),
  bioLink: z.looseObject({
    link: stringFieldSchema.optional(),
  }).optional(),
  commerceUserInfo: z.looseObject({
    category: stringFieldSchema.optional(),
  }).optional(),
});

const tikhubProfileStatsSchema = z.looseObject({
  followerCount: numericFieldSchema.optional(),
  followingCount: numericFieldSchema.optional(),
  heart: numericFieldSchema.optional(),
  heartCount: numericFieldSchema.optional(),
  videoCount: numericFieldSchema.optional(),
  friendCount: numericFieldSchema.optional(),
});

const tikhubProfileResponseSchema = z.looseObject({
  data: z.looseObject({
    userInfo: z.looseObject({
      user: tikhubProfileUserSchema,
      stats: tikhubProfileStatsSchema.optional(),
      statsV2: tikhubProfileStatsSchema.optional(),
    }),
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

const tikhubProfileInfoSchema = z.object({
  userId: z.string().nullable(),
  username: z.string().nullable(),
  secUserId: z.string().nullable(),
  nickname: z.string().nullable(),
  verified: z.boolean().nullable(),
  avatarThumbUrl: z.string().nullable(),
  avatarMediumUrl: z.string().nullable(),
  avatarLargeUrl: z.string().nullable(),
  bio: z.string().nullable(),
  bioLink: z.string().nullable(),
  category: z.string().nullable(),
  createdTime: z.number().nullable(),
  createdAt: z.string().nullable(),
  stats: z.object({
    followerCount: z.number().nullable(),
    followingCount: z.number().nullable(),
    likeCount: z.number().nullable(),
    videoCount: z.number().nullable(),
    friendCount: z.number().nullable(),
  }),
});

export type TikHubProfileInfo = z.infer<typeof tikhubProfileInfoSchema>;

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

export const extractTikHubProfileInfo = (
  payload: unknown,
): Result<TikHubProfileInfo, UpstreamResponseError> => {
  const parsed = tikhubProfileResponseSchema.safeParse(payload);
  if (!parsed.success) {
    return Result.err(
      new UpstreamResponseError({
        service: "TikHub",
        message: "TikHub profile response schema mismatch",
      }),
    );
  }

  const userInfo = parsed.data.data.userInfo;
  const user = userInfo.user;
  const stats = userInfo.stats;
  const statsV2 = userInfo.statsV2;
  const followerCount = statsV2?.followerCount ?? stats?.followerCount ?? null;
  // Prefer `stats.followingCount` first because the live API currently sends it as a number there.
  const followingCount = stats?.followingCount ?? statsV2?.followingCount ?? null;
  const likeCount = statsV2?.heartCount ?? statsV2?.heart ?? stats?.heartCount ?? stats?.heart ?? null;
  const videoCount = statsV2?.videoCount ?? stats?.videoCount ?? null;
  const friendCount = statsV2?.friendCount ?? stats?.friendCount ?? null;

  const normalizedProfileInfo = {
    userId: user.id ?? null,
    username: user.uniqueId ?? null,
    secUserId: user.secUid ?? null,
    nickname: user.nickname ?? null,
    verified: user.verified ?? null,
    avatarThumbUrl: user.avatarThumb ?? null,
    avatarMediumUrl: user.avatarMedium ?? null,
    avatarLargeUrl: user.avatarLarger ?? null,
    bio: user.signature ?? null,
    bioLink: user.bioLink?.link ?? null,
    category: user.commerceUserInfo?.category ?? null,
    createdTime: user.createTime ?? null,
    createdAt: unixToIso(user.createTime),
    stats: {
      followerCount,
      followingCount,
      likeCount,
      videoCount,
      friendCount,
    },
  } satisfies TikHubProfileInfo;

  const normalized = tikhubProfileInfoSchema.safeParse(normalizedProfileInfo);
  if (!normalized.success) {
    return Result.err(
      new UpstreamResponseError({
        service: "TikHub",
        message: "TikHub profile normalization mismatch",
      }),
    );
  }

  return Result.ok(normalized.data);
};
