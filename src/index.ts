import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono();
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

app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

app.onError((err, c) => {
  console.error('Unhandled error', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

export default app;
