import { afterAll, afterEach, beforeAll } from 'vitest';
import { resetMockState } from './mock-state';
import { createExpiredSessionCookie } from './handlers/handler-utils';
import { server } from './server';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
  resetMockState();
  document.cookie = createExpiredSessionCookie();
});

afterAll(() => {
  server.close();
});
