import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { desc } from 'drizzle-orm';
import { createDbClient } from './db/client';
import { posts as postsTable } from './db/schema';

const app = new Hono<{ Bindings: Env }>();
const createPostSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  published: z.boolean().optional(),
});

app.get('/health', (c) => {
  return c.json({ ok: true });
});

app.get('/api/posts', async (c) => {
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

app.post('/api/posts', zValidator('json', createPostSchema), async (c) => {
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
