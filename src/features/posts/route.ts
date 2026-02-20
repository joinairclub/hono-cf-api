import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { respond } from "../../app/respond";
import { connectDb } from "../../db/connect";
import { createPost, listPosts } from "./repository";
import { createPostSchema } from "./schema";

export const postsRoutes = new Hono<{ Bindings: Env }>();

postsRoutes.get("/", async (c) => {
  const result = await connectDb(c.env.HYPERDRIVE.connectionString).then((dbResult) =>
    dbResult.andThenAsync(listPosts),
  );

  return respond(c, result);
});

postsRoutes.post("/", zValidator("json", createPostSchema), async (c) => {
  const payload = c.req.valid("json");

  const result = await connectDb(c.env.HYPERDRIVE.connectionString).then((dbResult) =>
    dbResult.andThenAsync((db) => createPost(db, payload)),
  );

  return respond(c, result, 201);
});
