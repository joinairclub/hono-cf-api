import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db/client";
import { postsRoutes } from "@/features/posts/route";
import {
  listPostsResponseDataSchema,
  postResponseSchema,
} from "@/features/posts/schema";
import { DbQueryError } from "@/shared/errors/app-error";
import { Result } from "@/shared/result";
import {
  apiErrorResponseSchema,
  apiSuccessResponseSchema,
} from "@/shared/schemas/api-response";

const mockDb = {} as Db;
const mockClient = {
  connect: vi.fn(),
  end: vi.fn(),
};

const mocks = vi.hoisted(() => ({
  createDbClient: vi.fn(),
  listPosts: vi.fn(),
  createPost: vi.fn(),
}));

vi.mock("@/db/client", () => ({
  createDbClient: mocks.createDbClient,
}));

vi.mock("@/features/posts/repository", () => ({
  listPosts: mocks.listPosts,
  createPost: mocks.createPost,
}));

const mockEnv = {
  HYPERDRIVE: {
    connectionString: "postgresql://example",
  },
} as unknown as Env;

const mockExecutionCtx = {
  waitUntil: vi.fn(),
  passThroughOnException: vi.fn(),
  props: {},
};

const postPayload = {
  title: "New title",
  body: "New body",
  published: true,
};

const listPostsResponseSchema = apiSuccessResponseSchema(listPostsResponseDataSchema);
const createPostResponseSchema = apiSuccessResponseSchema(postResponseSchema);

const createTestApp = () => {
  const app = new Hono<{ Bindings: Env }>();
  app.route("/api/posts", postsRoutes);
  return app;
};

beforeEach(() => {
  vi.clearAllMocks();
  mockClient.connect.mockResolvedValue(undefined);
  mockClient.end.mockResolvedValue(undefined);
  mocks.createDbClient.mockReturnValue({ client: mockClient, db: mockDb });
  mocks.listPosts.mockResolvedValue(Result.ok([]));
  mocks.createPost.mockResolvedValue(
    Result.err(new DbQueryError({ operation: "create post", cause: new Error("not configured") })),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("posts routes", () => {
  it("returns posts", async () => {
    const app = createTestApp();
    mocks.listPosts.mockResolvedValue(
      Result.ok([
        {
          id: 1,
          title: "Hello",
          body: "World",
          published: false,
          createdAt: new Date("2026-02-19T00:00:00.000Z"),
        },
      ]),
    );

    const response = await app.request("/api/posts", undefined, mockEnv, mockExecutionCtx);
    const body = listPostsResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data[0]?.title).toBe("Hello");
    expect(mocks.listPosts).toHaveBeenCalledWith(mockDb);
  });

  it("returns 500 when db connect throws", async () => {
    const app = createTestApp();
    mockClient.connect.mockRejectedValue(new Error("connection refused"));

    const response = await app.request("/api/posts", undefined, mockEnv, mockExecutionCtx);

    expect(response.status).toBe(500);
    const body = apiErrorResponseSchema.parse(await response.json());
    expect(body.error.message).toBe("Database connection failed");
    expect(body.error.code).toBe("DbConnectionError");
  });

  it("creates a post", async () => {
    const app = createTestApp();
    mocks.createPost.mockResolvedValue(
      Result.ok({
        id: 99,
        ...postPayload,
        createdAt: new Date("2026-02-19T10:00:00.000Z"),
      }),
    );

    const response = await app.request(
      "/api/posts",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(postPayload),
      },
      mockEnv,
      mockExecutionCtx,
    );
    const body = createPostResponseSchema.parse(await response.json());

    expect(response.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data.title).toBe(postPayload.title);
    expect(mocks.createPost).toHaveBeenCalledWith(mockDb, postPayload);
  });

  it("returns 500 on post create error", async () => {
    const app = createTestApp();
    mocks.createPost.mockResolvedValue(
      Result.err(new DbQueryError({ operation: "create post", cause: new Error("duplicate") })),
    );

    const response = await app.request(
      "/api/posts",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "T", body: "B" }),
      },
      mockEnv,
      mockExecutionCtx,
    );

    expect(response.status).toBe(500);
    const body = apiErrorResponseSchema.parse(await response.json());
    expect(body.error.message).toBe("Database query failed");
    expect(body.error.code).toBe("DbQueryError");
  });

  it("returns 400 for invalid post payload", async () => {
    const app = createTestApp();
    const response = await app.request(
      "/api/posts",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "", body: "" }),
      },
      mockEnv,
      mockExecutionCtx,
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 for whitespace-only title", async () => {
    const app = createTestApp();
    const response = await app.request(
      "/api/posts",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "   ", body: "Valid body" }),
      },
      mockEnv,
      mockExecutionCtx,
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 for title exceeding 300 characters", async () => {
    const app = createTestApp();
    const response = await app.request(
      "/api/posts",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "a".repeat(301), body: "Valid body" }),
      },
      mockEnv,
      mockExecutionCtx,
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 for body exceeding 50000 characters", async () => {
    const app = createTestApp();
    const response = await app.request(
      "/api/posts",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Valid title", body: "a".repeat(50_001) }),
      },
      mockEnv,
      mockExecutionCtx,
    );

    expect(response.status).toBe(400);
  });
});
