import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { respond } from "../../app/respond";
import { tiktokShareUrlQuerySchema } from "./schema";
import { resolveTikTokDownload, resolveTikTokInfo } from "./service";

export const tiktokDownloadRoutes = new Hono<{ Bindings: Env }>();

tiktokDownloadRoutes.get(
  "/download",
  zValidator("query", tiktokShareUrlQuerySchema),
  async (c) => {
    const { share_url: shareUrl } = c.req.valid("query");
    const result = await resolveTikTokDownload({ env: c.env, shareUrl });
    return respond(c, result);
  },
);

tiktokDownloadRoutes.get("/info", zValidator("query", tiktokShareUrlQuerySchema), async (c) => {
  const { share_url: shareUrl } = c.req.valid("query");
  const result = await resolveTikTokInfo({ env: c.env, shareUrl });
  return respond(c, result);
});
