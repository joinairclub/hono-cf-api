import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { respond } from "../../../app/respond";
import { tiktokProfileQuerySchema } from "./schema";
import { resolveTikTokProfile } from "./service";

export const tiktokProfileRoutes = new Hono<{ Bindings: Env }>();

tiktokProfileRoutes.get("/profile", zValidator("query", tiktokProfileQuerySchema), async (c) => {
  const { username } = c.req.valid("query");
  const result = await resolveTikTokProfile({ env: c.env, username });
  return respond(c, result);
});
