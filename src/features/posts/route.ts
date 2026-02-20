import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { respond } from "../../app/respond";
import { connectDb } from "../../db/connect";
import { Result } from "../../shared/result";
import { createPost, listPosts } from "./repository";
import { createPostSchema } from "./schema";

export const postsRoutes = new Hono<{ Bindings: Env }>();

postsRoutes.get("/", async (c) => {
  const result = await Result.gen(async function* () {
    const db = yield* Result.await(connectDb(c.env.HYPERDRIVE.connectionString));
    const posts = yield* Result.await(listPosts(db));
    return Result.ok(posts);
  });

  return respond(c, result);
});

postsRoutes.post("/", zValidator("json", createPostSchema), async (c) => {
  const payload = c.req.valid("json");

  const result = await Result.gen(async function* () {
    const db = yield* Result.await(connectDb(c.env.HYPERDRIVE.connectionString));
    const post = yield* Result.await(createPost(db, payload));
    return Result.ok(post);
  });

  return respond(c, result, 201);
});
