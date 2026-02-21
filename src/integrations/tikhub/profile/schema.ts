import { z } from "zod";
import { UpstreamResponseError } from "../../../shared/errors/app-error";
import { Result } from "../../../shared/result";
import { normalizeNumberValue } from "../../../shared/schemas/number";
import { normalizeOptionalBoolean, normalizeStringValue } from "../../../shared/schemas/string";

const optionalNumericFieldSchema = z.preprocess(normalizeNumberValue, z.number().optional());
const optionalStringFieldSchema = z.preprocess(
  normalizeStringValue,
  z.string().min(1).optional(),
);
const optionalBooleanFieldSchema = z.preprocess(
  normalizeOptionalBoolean,
  z.boolean().optional(),
);

const tikhubProfileUserSchema = z.looseObject({
  id: optionalStringFieldSchema,
  uniqueId: optionalStringFieldSchema,
  secUid: optionalStringFieldSchema,
  nickname: optionalStringFieldSchema,
  verified: optionalBooleanFieldSchema,
  signature: optionalStringFieldSchema,
  createTime: optionalNumericFieldSchema,
  avatarThumb: optionalStringFieldSchema,
  avatarMedium: optionalStringFieldSchema,
  avatarLarger: optionalStringFieldSchema,
  bioLink: z.looseObject({
    link: optionalStringFieldSchema,
  }).optional(),
  commerceUserInfo: z.looseObject({
    category: optionalStringFieldSchema,
  }).optional(),
});

const tikhubProfileStatsSchema = z.looseObject({
  followerCount: optionalNumericFieldSchema,
  followingCount: optionalNumericFieldSchema,
  heart: optionalNumericFieldSchema,
  heartCount: optionalNumericFieldSchema,
  videoCount: optionalNumericFieldSchema,
  friendCount: optionalNumericFieldSchema,
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

const unixToIso = (value: number | undefined): string | null => {
  if (value === undefined) {
    return null;
  }

  const milliseconds = value >= 1_000_000_000_000 ? value : value * 1_000;
  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
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
