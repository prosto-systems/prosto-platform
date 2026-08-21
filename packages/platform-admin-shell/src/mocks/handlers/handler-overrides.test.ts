import { HttpResponse, http } from 'msw';
import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { HttpClient } from '@/shared/api';
import { server } from '../server';

const SESSION_URL = 'http://127.0.0.1:3001/api/admin/auth/session';

describe('MSW handler overrides', () => {
  it.each([
    [401, 'session_expired'],
    [403, 'permission_denied'],
    [422, 'validation_failed'],
    [500, 'server_error'],
  ])('returns overridden %i responses', async (status, code) => {
    server.use(
      http.get(SESSION_URL, () => HttpResponse.json({ code }, { status })),
    );

    const response = await fetch(SESSION_URL);

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({ code });
  });

  it('normalizes a malformed overridden response', async () => {
    server.use(
      http.get(SESSION_URL, () => HttpResponse.json({ unexpected: true })),
    );

    const client = new HttpClient();

    await expect(
      client.request(SESSION_URL, {
        responseSchema: z.object({ expected: z.string() }),
      }),
    ).rejects.toMatchObject({ code: 'invalid_response', status: 200 });
  });

  it('normalizes an overridden network failure', async () => {
    server.use(http.get(SESSION_URL, () => HttpResponse.error()));

    const client = new HttpClient();

    await expect(client.request(SESSION_URL)).rejects.toMatchObject({
      code: 'network_error',
      status: 0,
    });
  });
});
