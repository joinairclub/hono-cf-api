import { Hono } from "hono";
import { postsRoutes } from "../features/posts/route";
import { InternalError, NotFoundError, toApiError } from "../shared/errors/app-error";
import { isPanic } from "../shared/result";

export const createApp = () => {
  const app = new Hono<{ Bindings: Env }>();

  app.get("/ping", (c) => c.json({ pong: true }));
  app.get("/health", (c) => c.json({ ok: true }));

  app.route("/api/posts", postsRoutes);

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
