import { z } from "zod";

const tiktokShareUrlSchema = z.url({
  protocol: /^https?$/,
  hostname: /(^|\.)tiktok\.com$/i,
});

export const tiktokShareUrlQuerySchema = z.object({
  share_url: tiktokShareUrlSchema,
});

export type TikTokShareUrlQuery = z.infer<typeof tiktokShareUrlQuerySchema>;
