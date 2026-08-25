import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MOCK_SESSION_STORAGE_KEY,
  MockSessionStorage,
} from './mock-session-storage';

const NOW = 1_000;
const VALID_USER_IDS = new Set(['user-admin']);

describe('MockSessionStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('restores a valid session snapshot', () => {
    const storage = new MockSessionStorage(localStorage);
    const snapshot = {
      sessionSequence: 1,
      sessions: [
        {
          csrfToken: 'mock-csrf-1',
          expiresAt: NOW + 1_000,
          id: 'mock-session-1',
          userId: 'user-admin',
        },
      ],
    };

    storage.save(snapshot);
    const restoredSnapshot = new MockSessionStorage(localStorage).load(
      VALID_USER_IDS,
      NOW,
    );

    expect(restoredSnapshot).toEqual(snapshot);
  });

  it('removes malformed persisted data', () => {
    localStorage.setItem(MOCK_SESSION_STORAGE_KEY, '{invalid-json');
    const storage = new MockSessionStorage(localStorage);

    const restoredSnapshot = storage.load(VALID_USER_IDS, NOW);

    expect(restoredSnapshot).toEqual({ sessionSequence: 0, sessions: [] });
    expect(localStorage.getItem(MOCK_SESSION_STORAGE_KEY)).toBeNull();
  });

  it('filters expired and unknown-user sessions', () => {
    const storage = new MockSessionStorage(localStorage);
    storage.save({
      sessionSequence: 3,
      sessions: [
        {
          csrfToken: 'mock-csrf-2',
          expiresAt: NOW,
          id: 'mock-session-2',
          userId: 'user-admin',
        },
        {
          csrfToken: 'mock-csrf-3',
          expiresAt: NOW + 1_000,
          id: 'mock-session-3',
          userId: 'unknown-user',
        },
      ],
    });

    const restoredSnapshot = storage.load(VALID_USER_IDS, NOW);

    expect(restoredSnapshot).toEqual({ sessionSequence: 3, sessions: [] });
    expect(
      JSON.parse(localStorage.getItem(MOCK_SESSION_STORAGE_KEY) ?? ''),
    ).toEqual({
      sessionSequence: 3,
      sessions: [],
      version: 1,
    });
  });

  it('prevents sequence reuse when the persisted counter is stale', () => {
    localStorage.setItem(
      MOCK_SESSION_STORAGE_KEY,
      JSON.stringify({
        sessionSequence: 0,
        sessions: [
          {
            csrfToken: 'mock-csrf-7',
            expiresAt: NOW + 1_000,
            id: 'mock-session-7',
            userId: 'user-admin',
          },
        ],
        version: 1,
      }),
    );
    const storage = new MockSessionStorage(localStorage);

    const restoredSnapshot = storage.load(VALID_USER_IDS, NOW);

    expect(restoredSnapshot.sessionSequence).toBe(7);
  });

  it('falls back to an empty snapshot when storage is unavailable', () => {
    const storage = new MockSessionStorage(new ThrowingStorage());

    expect(storage.load(VALID_USER_IDS, NOW)).toEqual({
      sessionSequence: 0,
      sessions: [],
    });
    expect(() =>
      storage.save({ sessionSequence: 0, sessions: [] }),
    ).not.toThrow();
    expect(() => storage.clear()).not.toThrow();
  });

  it('removes a stale snapshot when an update cannot be written', () => {
    const storage = new MockSessionStorage(localStorage);
    storage.save({ sessionSequence: 1, sessions: [] });
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('Storage full');
    });

    storage.save({ sessionSequence: 2, sessions: [] });

    expect(localStorage.getItem(MOCK_SESSION_STORAGE_KEY)).toBeNull();
  });
});

class ThrowingStorage implements Storage {
  public readonly length = 0;

  public clear(): void {
    throw new Error('Storage unavailable');
  }

  public getItem(_key: string): string | null {
    throw new Error('Storage unavailable');
  }

  public key(_index: number): string | null {
    throw new Error('Storage unavailable');
  }

  public removeItem(_key: string): void {
    throw new Error('Storage unavailable');
  }

  public setItem(_key: string, _value: string): void {
    throw new Error('Storage unavailable');
  }
}
