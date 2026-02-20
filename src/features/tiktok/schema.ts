import { z } from "zod";

const isTikTokHost = (value: string) => {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "tiktok.com" || hostname.endsWith(".tiktok.com");
  } catch {
    return false;
  }
};

export const tiktokDownloadQuerySchema = z.object({
  share_url: z
    .url()
    .refine(isTikTokHost, { message: "share_url must be a TikTok URL" }),
});

export type TikTokDownloadQuery = z.infer<typeof tiktokDownloadQuerySchema>;
