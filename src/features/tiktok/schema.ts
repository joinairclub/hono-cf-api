import { z } from "zod";
import { trimmedStringSchema } from "../../shared/schemas/string";

const tiktokShareUrlSchema = trimmedStringSchema.pipe(
  z.url({
    protocol: /^https?$/,
    hostname: /(^|\.)tiktok\.com$/i,
  }),
);

export const tiktokShareUrlQuerySchema = z.object({
  share_url: tiktokShareUrlSchema,
});

export type TikTokShareUrlQuery = z.infer<typeof tiktokShareUrlQuerySchema>;
