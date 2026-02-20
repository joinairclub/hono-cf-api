import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { respond } from "../../app/respond";
import { transcribeAudioRequestSchema } from "./schema";
import { transcribeAudioUrl } from "./service";

export const transcribeRoutes = new Hono<{ Bindings: Env }>();

transcribeRoutes.post("/", zValidator("json", transcribeAudioRequestSchema), async (c) => {
  const { audioUrl } = c.req.valid("json");
  const result = await transcribeAudioUrl({ env: c.env, audioUrl });
  return respond(c, result);
});
