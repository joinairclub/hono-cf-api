import { describe, expect, it } from 'vitest';
import app from './index';

describe('GET /health', () => {
  it('returns an ok response', async () => {
    const response = await app.request('/health');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(await response.json()).toEqual({ ok: true });
  });
});

describe('GET /unknown', () => {
  it('returns a not found response', async () => {
    const response = await app.request('/unknown');
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Not Found' });
  });
});
