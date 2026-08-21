import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { HttpClient } from './http-client';

describe('HttpClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses same-origin credentials and rejects malformed successful responses', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ unexpected: true }), { status: 200 }),
      );

    vi.stubGlobal('fetch', fetchMock);

    const client = new HttpClient();

    await expect(
      client.request('/api/admin/auth/session', {
        responseSchema: z.object({ expected: z.string() }),
      }),
    ).rejects.toMatchObject({ code: 'invalid_response', status: 200 });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/auth/session',
      expect.objectContaining({ credentials: 'same-origin' }),
    );
  });

  it('normalizes unauthorized errors and calls the invalidation hook', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ code: 'session_expired' }), {
          status: 401,
        }),
      ),
    );

    const onUnauthorized = vi.fn();
    const client = new HttpClient();

    client.setUnauthorizedHandler(onUnauthorized);

    await expect(
      client.request('/api/admin/auth/session'),
    ).rejects.toMatchObject({
      code: 'session_expired',
      status: 401,
    });

    expect(onUnauthorized).toHaveBeenCalledOnce();
    expect(onUnauthorized).toHaveBeenCalledWith({
      method: 'GET',
      path: '/api/admin/auth/session',
    });
  });
});
