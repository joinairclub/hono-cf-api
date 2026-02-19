import { describe, expect, it } from 'vitest';
import app from './index';

describe('POST /api/posts', () => {
  it('creates a post for valid JSON input', async () => {
    const response = await app.request('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Hello Hono',
        body: 'Validated with zod.',
      }),
    });

    expect(response.status).toBe(201);
    expect(response.headers.get('content-type')).toContain('application/json');

    const data = await response.json<{
      id: string;
      title: string;
      body: string;
      published?: boolean;
    }>();

    expect(data.id).toBeTypeOf('string');
    expect(data.title).toBe('Hello Hono');
    expect(data.body).toBe('Validated with zod.');
  });
});
