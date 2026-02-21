import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { respond } from "@/app/respond";
import { tiktokShareUrlQuerySchema } from "@/features/tiktok/video/schema";
import { resolveTikTokInfo } from "@/features/tiktok/video/service";

export const tiktokVideoRoutes = new Hono<{ Bindings: Env }>();

tiktokVideoRoutes.get("/info", zValidator("query", tiktokShareUrlQuerySchema), async (c) => {
  const { share_url: shareUrl } = c.req.valid("query");
  const result = await resolveTikTokInfo({ env: c.env, shareUrl });
  return respond(c, result);
});
