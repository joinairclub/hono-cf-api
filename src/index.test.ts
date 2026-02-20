import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from './db/client';
import { DbConnectionError, DbQueryError } from './shared/errors/app-error';
import { Result } from './shared/result';

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

vi.mock('./db/client', () => ({
  createDbClient: mocks.createDbClient,
}));

vi.mock('./features/posts/repository', () => ({
  listPosts: mocks.listPosts,
  createPost: mocks.createPost,
}));

import { createApp } from './index';

const mockEnv = {
  HYPERDRIVE: {
    connectionString: 'postgresql://example',
  },
} as unknown as Env;

const mockExecutionCtx = {
  waitUntil: vi.fn(),
  passThroughOnException: vi.fn(),
  props: {},
};

const postPayload = {
  title: 'New title',
  body: 'New body',
  published: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockClient.connect.mockResolvedValue(undefined);
  mockClient.end.mockResolvedValue(undefined);
  mocks.createDbClient.mockReturnValue({ client: mockClient, db: mockDb });
  mocks.listPosts.mockResolvedValue(Result.ok([]));
  mocks.createPost.mockResolvedValue(
    Result.err(new DbQueryError({ operation: 'create post', cause: new Error('not configured') })),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('api routes', () => {
  it('returns ping', async () => {
    const app = createApp();
    const response = await app.request('/ping');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ pong: true });
  });

  it('returns health', async () => {
    const app = createApp();
    const response = await app.request('/health');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it('returns posts', async () => {
    const app = createApp();
    mocks.listPosts.mockResolvedValue(
      Result.ok([
        {
          id: 1,
          title: 'Hello',
          body: 'World',
          published: false,
          createdAt: new Date('2026-02-19T00:00:00.000Z'),
        },
      ]),
    );

    const response = await app.request('/api/posts', undefined, mockEnv, mockExecutionCtx);
    const body = (await response.json()) as { data: Array<{ title: string }>; error: null };

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data[0]?.title).toBe('Hello');
    expect(mocks.listPosts).toHaveBeenCalledWith(mockDb);
  });

  it('returns 500 when db connect throws', async () => {
    const app = createApp();
    mockClient.connect.mockRejectedValue(new Error('connection refused'));

    const response = await app.request('/api/posts', undefined, mockEnv, mockExecutionCtx);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      data: null,
      error: { message: 'Database connection failed', code: 'DbConnectionError' },
    });
  });

  it('creates a post', async () => {
    const app = createApp();
    mocks.createPost.mockResolvedValue(
      Result.ok({
        id: 99,
        ...postPayload,
        createdAt: new Date('2026-02-19T10:00:00.000Z'),
      }),
    );

    const response = await app.request(
      '/api/posts',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(postPayload),
      },
      mockEnv,
      mockExecutionCtx,
    );
    const body = (await response.json()) as { data: { title: string }; error: null };

    expect(response.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data.title).toBe(postPayload.title);
    expect(mocks.createPost).toHaveBeenCalledWith(mockDb, postPayload);
  });

  it('returns 500 on post create error', async () => {
    const app = createApp();
    mocks.createPost.mockResolvedValue(
      Result.err(new DbQueryError({ operation: 'create post', cause: new Error('duplicate') })),
    );

    const response = await app.request(
      '/api/posts',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'T', body: 'B' }),
      },
      mockEnv,
      mockExecutionCtx,
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      data: null,
      error: { message: 'Database query failed', code: 'DbQueryError' },
    });
  });
});
