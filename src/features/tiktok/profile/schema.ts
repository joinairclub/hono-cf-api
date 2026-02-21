import { z } from "zod";
import { trimmedStringSchema } from "../../../shared/schemas/string";

const tiktokUsernameSchema = trimmedStringSchema
  .transform((value) => value.replace(/^@/, ""))
  .pipe(
    z
      .string()
      .min(1, "username cannot be empty")
      .max(64, "username must be at most 64 characters")
      .regex(/^[A-Za-z0-9._]+$/, "username must contain only letters, numbers, '.' or '_'"),
  );

export const tiktokProfileQuerySchema = z.object({
  username: tiktokUsernameSchema,
});

export const tiktokProfileStatsSchema = z.object({
  followerCount: z.number().nullable(),
  followingCount: z.number().nullable(),
  likeCount: z.number().nullable(),
  videoCount: z.number().nullable(),
  friendCount: z.number().nullable(),
});

export const tiktokProfileResultSchema = z.object({
  username: z.string(),
  profile: z.object({
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
    stats: tiktokProfileStatsSchema,
  }),
});

export type TikTokProfileQuery = z.infer<typeof tiktokProfileQuerySchema>;
export type TikTokProfileResult = z.infer<typeof tiktokProfileResultSchema>;
