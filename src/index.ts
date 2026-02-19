import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { desc, sql } from 'drizzle-orm';
import { createDbClient } from './db/client';
import { posts as postsTable } from './db/schema';

type AppBindings = {
  HYPERDRIVE: Hyperdrive;
};

const app = new Hono<{ Bindings: AppBindings }>();
const createPostSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  published: z.boolean().optional(),
});

app.get('/', (c) => {
  return c.json({
    service: 'hono-cf-api',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (c) => {
  return c.json({ ok: true });
});

app.post('/api/echo', async (c) => {
  const body = await c.req.json<unknown>();
  return c.json({ received: body });
});

app.post('/api/posts', zValidator('json', createPostSchema), (c) => {
  const post = c.req.valid('json');
  return c.json(
    {
      id: crypto.randomUUID(),
      ...post,
    },
    201
  );
});

app.get('/api/db/health', async (c) => {
  const { client, db } = createDbClient(c.env.HYPERDRIVE.connectionString);
  try {
    await client.connect();
    await db.execute(sql`select 1`);
    return c.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    return c.json({ ok: false, error: message }, 500);
  } finally {
    c.executionCtx.waitUntil(client.end());
  }
});

app.get('/api/db/posts', async (c) => {
  const { client, db } = createDbClient(c.env.HYPERDRIVE.connectionString);
  try {
    await client.connect();
    const rows = await db
      .select()
      .from(postsTable)
      .orderBy(desc(postsTable.id))
      .limit(20);
    return c.json({ posts: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    return c.json({ error: message }, 500);
  } finally {
    c.executionCtx.waitUntil(client.end());
  }
});

app.post('/api/db/posts', zValidator('json', createPostSchema), async (c) => {
  const { client, db } = createDbClient(c.env.HYPERDRIVE.connectionString);
  try {
    await client.connect();
    const payload = c.req.valid('json');
    const [created] = await db
      .insert(postsTable)
      .values({
        title: payload.title,
        body: payload.body,
        published: payload.published ?? false,
      })
      .returning();

    return c.json({ post: created }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    return c.json({ error: message }, 500);
  } finally {
    c.executionCtx.waitUntil(client.end());
  }
});

app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

app.onError((err, c) => {
  console.error('Unhandled error', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

export default app;
