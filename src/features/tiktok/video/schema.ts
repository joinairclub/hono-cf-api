import { z } from "zod";
import { trimmedStringSchema } from "../../../shared/schemas/string";

const tiktokShareUrlSchema = trimmedStringSchema.pipe(
  z.url({
    protocol: /^https?$/,
    hostname: /(^|\.)tiktok\.com$/i,
  }),
);

export const tiktokShareUrlQuerySchema = z.object({
  share_url: tiktokShareUrlSchema,
});

const tiktokVideoAuthorSchema = z.object({
  userId: z.string().nullable(),
  username: z.string().nullable(),
  nickname: z.string().nullable(),
});

const tiktokVideoStatsSchema = z.object({
  playCount: z.number().nullable(),
  likeCount: z.number().nullable(),
  commentCount: z.number().nullable(),
  shareCount: z.number().nullable(),
});

const tiktokVideoResultSchema = z.object({
  id: z.string(),
  description: z.string().nullable(),
  durationMs: z.number().nullable(),
  createdAt: z.string().nullable(),
  hashtags: z.array(z.string()),
  author: tiktokVideoAuthorSchema,
  stats: tiktokVideoStatsSchema,
  thumbnailUrl: z.string().nullable(),
  audioUrl: z.string().nullable(),
  downloadUrl: z.string(),
});

export const tiktokInfoResultSchema = z.object({
  shareUrl: z.string(),
  video: tiktokVideoResultSchema,
});

export type TikTokShareUrlQuery = z.infer<typeof tiktokShareUrlQuerySchema>;
export type TikTokInfoResult = z.infer<typeof tiktokInfoResultSchema>;
