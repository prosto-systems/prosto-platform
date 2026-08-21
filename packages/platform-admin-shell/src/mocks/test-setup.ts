import { afterAll, afterEach, beforeAll } from 'vitest';
import { resetMockState } from './mock-state';
import { server } from './server';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
  resetMockState();
});

afterAll(() => {
  server.close();
});
