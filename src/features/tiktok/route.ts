import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { respond } from "../../app/respond";
import { previewTikTokDownload } from "./service";
import { tiktokDownloadQuerySchema } from "./schema";

export const tiktokDownloadRoutes = new Hono<{ Bindings: Env }>();

tiktokDownloadRoutes.get(
  "/download",
  zValidator("query", tiktokDownloadQuerySchema),
  async (c) => {
    const { share_url: shareUrl } = c.req.valid("query");
    return respond(c, previewTikTokDownload(shareUrl));
  },
);
