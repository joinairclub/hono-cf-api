import { Hono } from "hono";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { zValidator } from "@hono/zod-validator";
import { Result, isPanic } from "./lib/result";
import { createDbClient } from "./db/client";
import {
  type AppError,
  DbConnectionError,
  NotFoundError,
  InternalError,
  toApiError,
} from "./errors/app-error";
import { createPost, listPosts } from "./posts/repository";
import { createPostSchema } from "./posts/schema";

const connect = (connectionString: string) =>
  Result.tryPromise({
    try: () => {
      const { client, db } = createDbClient(connectionString);
      return client.connect().then(() => db);
    },
    catch: (cause) => new DbConnectionError({ cause }),
  });

const respond = <T>(
  c: Context,
  result: Result<T, AppError>,
  status: ContentfulStatusCode = 200,
) =>
  Result.match<T, AppError, Response>(result, {
    ok: (value) => c.json({ data: value, error: null }, status),
    err: (error) => {
      const apiError = toApiError(error);
      return c.json({ data: null, error: apiError.error }, apiError.status);
    },
  });

export const createApp = () => {
  const app = new Hono<{ Bindings: Env }>();

  app.get("/", (c) => {
    return c.json({ name: "hono-cf-api", ok: true });
  });

  app.get("/health", (c) => {
    return c.json({ ok: true });
  });

  app.get("/api/posts", async (c) => {
    const result = await Result.gen(async function* () {
      const db = yield* Result.await(
        connect(c.env.HYPERDRIVE.connectionString),
      );
      const posts = yield* Result.await(listPosts(db));
      return Result.ok(posts);
    });

    return respond(c, result);
  });

  app.post("/api/posts", zValidator("json", createPostSchema), async (c) => {
    const payload = c.req.valid("json");

    const result = await Result.gen(async function* () {
      const db = yield* Result.await(
        connect(c.env.HYPERDRIVE.connectionString),
      );
      const post = yield* Result.await(createPost(db, payload));
      return Result.ok(post);
    });

    return respond(c, result, 201);
  });

  app.notFound((c) => {
    const { status, error } = toApiError(
      new NotFoundError({ message: "Not Found" }),
    );
    return c.json({ data: null, error }, status);
  });

  app.onError((err, c) => {
    const { method } = c.req;
    const path = new URL(c.req.url).pathname;

    if (isPanic(err)) {
      console.error(
        JSON.stringify({
          level: "error",
          type: "panic",
          method,
          path,
          ...err.toJSON(),
        }),
      );
    } else {
      console.error(
        JSON.stringify({
          level: "error",
          type: "unhandled",
          method,
          path,
          name: err instanceof Error ? err.name : "Unknown",
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        }),
      );
    }

    const { status, error } = toApiError(
      new InternalError({ message: "Internal Server Error" }),
    );
    return c.json({ data: null, error }, status);
  });

  return app;
};

const app = createApp();

export default app;
