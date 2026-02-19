import { Hono } from 'hono';

const app = new Hono();

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

app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

app.onError((err, c) => {
  console.error('Unhandled error', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

export default app;
